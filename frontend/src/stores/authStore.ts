'use client';

/**
 * Estado global de autenticaÃ§Ã£o (Zustand + persist no localStorage): usuÃ¡rio, JWT e refresh.
 * No login/registro tambÃ©m grava cookie `user_role` para o **middleware** decidir rotas antes do React.
 * Sincroniza tokens com `lib/api.ts` para todas as requisiÃ§Ãµes usarem o mesmo Bearer e renovaÃ§Ã£o automÃ¡tica.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  api,
  setApiTokens,
  setOnLogout,
  setOnTokensRefreshed,
} from '@/lib/api';

import {
  AuthResponse,
  AuthUser,
  Confirm2faResponse,
  Enable2faResponse,
  LoginResponse,
  UserRole,
  Verify2faResponse,
} from '@/features/auth/types';

// (Re-export dos tipos para componentes que importam direto do store —
// mantém compatibilidade sem precisar atualizar 20 imports.)
export type { AuthUser, UserRole };

// â”€â”€ Cookie helpers (client-only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// â”€â”€ Store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

interface AuthActions {
  /** POST `/auth/login` â€” guarda tokens, usuÃ¡rio e cookie de papel. */
  login: (email: string, password: string) => Promise<LoginResponse>;
  /** POST `/auth/register` â€” mesmo efeito do login apÃ³s criar conta. */
  register: (
    name: string,
    email: string,
    password: string,
    role?: UserRole,
  ) => Promise<void>;
  /** Limpa storage, cookies e tokens do mÃ³dulo `api`. */
  logout: () => void;
  /** Usado pelo persist ao reabrir o site: recoloca tokens no `apiFetch` e liga callbacks de refresh/logout. */
  _hydrate: () => void;
  /** POST `/auth/enable-2fa` â€” gera QR code e secret temporÃ¡rio para ativar MFA. */
  enable2fa: () => Promise<Enable2faResponse>;
  /** POST `/auth/confirm-2fa` â€” confirma cÃ³digo TOTP e salva secret permanentemente. */
  confirm2fa: (code: string, secret: string) => Promise<Confirm2faResponse>;
  /** POST `/auth/verify-2fa` â€” valida cÃ³digo TOTP durante login e emite tokens. */
  verify2fa: (userId: string, code: string) => Promise<Verify2faResponse>;
  /** POST `/auth/disable-2fa` â€” desativa MFA e limpa o secret. */
  disable2fa: () => Promise<void>;
}

/** Hook React para ler/atualizar sessÃ£o; estado persiste entre abas do mesmo navegador. */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,

      login: async (email, password) => {
        const data = await api.post<LoginResponse>('/auth/login', {
          email,
          password,
        });
      
        // Caminho MFA: backend pediu TOTP. Não há tokens ainda — devolvemos
        // o objeto cru para a page renderizar o MfaVerifyForm na próxima etapa.
        if ('mfaRequired' in data) {
          return data;
        }
      
        // Caminho normal: backend já emitiu tokens. Persistimos sessão
        // e cookie de papel para o middleware do Next decidir rotas.
        set({ token: data.token, refreshToken: data.refreshToken, user: data.user });
        setApiTokens(data.token, data.refreshToken);
        setCookie('user_role', data.user.role);
        return data;
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
        api.post('/auth/logout', {}).catch(() => {});
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

      enable2fa: async () => {
        const data = await api.post<Enable2faResponse>('/auth/enable-2fa', {});
        return data;
      },

      confirm2fa: async (code, secret) => {
        const data = await api.post<Confirm2faResponse>('/auth/confirm-2fa', {
          code,
          secret,
        });
        const current = get().user;
        if (current) set({ user: { ...current, twoFactorEnabled: true } });
        return data;
      },

      disable2fa: async () => {
        await api.post('/auth/disable-2fa', {});
        const current = get().user;
        if (current) set({ user: { ...current, twoFactorEnabled: false } });
      },

      verify2fa: async (userId, code) => {
        const data = await api.post<Verify2faResponse>('/auth/verify-2fa', {
          userId,
          code,
        });
        set({ token: data.token, refreshToken: data.refreshToken, user: data.user });
        setApiTokens(data.token, data.refreshToken);
        setCookie('user_role', data.user.role);
        return data;
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
