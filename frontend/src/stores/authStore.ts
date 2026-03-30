'use client';

/**
 * Estado global de autenticação (Zustand + persist no localStorage): usuário, JWT e refresh.
 * No login/registro também grava cookie `user_role` para o **middleware** decidir rotas antes do React.
 * Sincroniza tokens com `lib/api.ts` para todas as requisições usarem o mesmo Bearer e renovação automática.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  api,
  setApiTokens,
  setOnLogout,
  setOnTokensRefreshed,
} from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'FACILITATOR' | 'PLAYER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

// ── Cookie helpers (client-only) ─────────────────────────────────────────────

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// ── Store ────────────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

interface AuthActions {
  /** POST `/auth/login` — guarda tokens, usuário e cookie de papel. */
  login: (email: string, password: string) => Promise<void>;
  /** POST `/auth/register` — mesmo efeito do login após criar conta. */
  register: (
    name: string,
    email: string,
    password: string,
    role?: UserRole,
  ) => Promise<void>;
  /** Limpa storage, cookies e tokens do módulo `api`. */
  logout: () => void;
  /** Usado pelo persist ao reabrir o site: recoloca tokens no `apiFetch` e liga callbacks de refresh/logout. */
  _hydrate: () => void;
}

/** Hook React para ler/atualizar sessão; estado persiste entre abas do mesmo navegador. */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,

      login: async (email, password) => {
        const data = await api.post<AuthResponse>('/auth/login', {
          email,
          password,
        });
        set({ token: data.token, refreshToken: data.refreshToken, user: data.user });
        setApiTokens(data.token, data.refreshToken);
        setCookie('user_role', data.user.role);
      },

      register: async (name, email, password, role = 'PLAYER') => {
        const data = await api.post<AuthResponse>('/auth/register', {
          name,
          email,
          password,
          role,
        });
        set({ token: data.token, refreshToken: data.refreshToken, user: data.user });
        setApiTokens(data.token, data.refreshToken);
        setCookie('user_role', data.user.role);
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null });
        setApiTokens(null, null);
        deleteCookie('user_role');
      },

      _hydrate: () => {
        const { token, refreshToken, logout } = get();
        setApiTokens(token, refreshToken);
        setOnLogout(logout);
        setOnTokensRefreshed((newToken) => set({ token: newToken }));
      },
    }),
    {
      name: 'retail-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage),
      ),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrate();
      },
    },
  ),
);
