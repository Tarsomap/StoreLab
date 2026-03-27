'use client';

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
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: UserRole,
  ) => Promise<void>;
  logout: () => void;
  /** Called by onRehydrateStorage to sync module-level api vars */
  _hydrate: () => void;
}

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
