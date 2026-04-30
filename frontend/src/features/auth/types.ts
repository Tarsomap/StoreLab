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

export interface Verify2faResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    twoFactorEnabled: boolean;
  };
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  userId: string;
}
