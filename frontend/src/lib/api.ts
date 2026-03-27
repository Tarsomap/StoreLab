const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Module-level token state ─────────────────────────────────────────────────
// Populated by authStore on hydration / login / logout.

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onLogout: (() => void) | null = null;
let _onTokensRefreshed: ((token: string) => void) | null = null;

export function setApiTokens(access: string | null, refresh: string | null) {
  _accessToken = access;
  _refreshToken = refresh;
}

export function setOnLogout(fn: () => void) {
  _onLogout = fn;
}

export function setOnTokensRefreshed(fn: (token: string) => void) {
  _onTokensRefreshed = fn;
}

// ── Refresh logic ────────────────────────────────────────────────────────────

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

// ── Main fetch wrapper ───────────────────────────────────────────────────────

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

  // Auto-refresh on 401
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

// ── Typed helpers ────────────────────────────────────────────────────────────

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

// ── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
