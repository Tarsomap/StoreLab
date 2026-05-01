export type StoreRole =
  | 'STORE_MANAGER'
  | 'SUPPLY_MANAGER'
  | 'COMMERCIAL_MANAGER'
  | 'OPERATIONAL_MANAGER'
  | 'SERVICE_MANAGER';

export const ROLE_LABELS: Record<StoreRole, string> = {
  STORE_MANAGER: 'Gerente da Loja',
  SUPPLY_MANAGER: 'Gerente de Abastecimento',
  COMMERCIAL_MANAGER: 'Gerente Comercial',
  OPERATIONAL_MANAGER: 'Gerente Operacional',
  SERVICE_MANAGER: 'Gerente de Serviços',
};

export interface JoinResponse {
  id: string;
  name: string;
  sessionId: string;
}

export interface UserStoreEntry {
  storeId: string;
  storeName: string;
  sessionId: string;
  role: StoreRole;
}

// === MFA (2FA TOTP) ===

export interface Enable2faResponse {
  qrCode: string;
  secret: string;
  otpauthUrl: string;
}

export interface Confirm2faResponse {
  message: string;
  success: boolean;
}

export type Verify2faResponse = AuthResponse;

export interface MfaRequiredResponse {
  mfaRequired: true;
  userId: string;
}

// === Auth core ===
export type UserRole = 'FACILITATOR' | 'PLAYER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  twoFactorEnabled: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Discriminated union do contrato de POST /auth/login.
 * Quando o usuário tem 2FA ativado, o backend responde MfaRequiredResponse
 * (sem tokens) — caso contrário, AuthResponse normal.
 *
 * Use narrowing: `if ('mfaRequired' in result) { ... }`.
 */
export type LoginResponse = AuthResponse | MfaRequiredResponse;