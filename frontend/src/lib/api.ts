/**
 * Cliente HTTP do front: base URL do backend, cabeçalho JSON e token Bearer quando o usuário está logado.
 * Mantém tokens em variáveis do módulo (sincronizadas pelo authStore) para não passar token em todo `fetch` manualmente.
 * Em 401 tenta renovar com `/auth/refresh` uma vez — assim o jogador não cai do app só porque o JWT curto expirou.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// Preenchido pelo authStore ao carregar do localStorage, login ou logout.

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onLogout: (() => void) | null = null;
let _onTokensRefreshed: ((token: string) => void) | null = null;

/** Chamado pelo store após login/logout/reidratação para o próximo `apiFetch` já levar o token certo. */
export function setApiTokens(access: string | null, refresh: string | null) {
  _accessToken = access;
  _refreshToken = refresh;
}

/** Se o refresh falhar, disparamos logout para limpar UI e mandar ao login. */
export function setOnLogout(fn: () => void) {
  _onLogout = fn;
}

/** Quando o backend devolve JWT novo, atualizamos o Zustand sem o usuário perceber. */
export function setOnTokensRefreshed(fn: (token: string) => void) {
  _onTokensRefreshed = fn;
}

// ── Renovação silenciosa ─────────────────────────────────────────────────────

async function tryRefresh(): Promise<boolean> {
  if (!_refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: _refreshToken }),
    });

    if (!res.ok) return false;

    const { token } = (await res.json()) as { token: string };
    _accessToken = token;
    _onTokensRefreshed?.(token);
    return true;
  } catch {
    return false;
  }
}

// ── Fetch central ────────────────────────────────────────────────────────────

/**
 * `fetch` para a API do jogo: anexa Authorization, trata 401 com refresh, converte erro em ApiError legível.
 * **Quando usar:** qualquer chamada REST; após sucesso o componente atualiza a tela (lista, formulário, etc.).
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && _refreshToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${_accessToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else {
      _onLogout?.();
      throw new ApiError('Sessão expirada. Faça login novamente.', 401);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(body.message ?? `HTTP ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Atalhos GET/POST/PATCH/DELETE com o mesmo comportamento de `apiFetch`. */
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

/** Erro com status HTTP para o componente mostrar toast ou mensagem inline. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
