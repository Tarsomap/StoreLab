/**
 * Resposta ao solicitar ativação de MFA.
 * Endpoint: POST /auth/enable-2fa
 */
export interface Enable2faResponse {
  /** QR code em formato base64 (data:image/png;base64,...) */
  qrCode: string;
  
  /** Secret temporário (ASCII) — cliente guarda e envia em confirm-2fa */
  secret: string;
  
  /** URL otpauth:// para importação manual se QR falhar */
  otpauthUrl: string;
}

/**
 * Resposta quando login requer MFA.
 * Cliente recebe isso se o usuário tem twoFactorEnabled === true.
 */
export interface MfaRequiredResponse {
  /** Flag indicando que MFA é necessário */
  mfaRequired: true;
  
  /** ID do usuário para enviar em verify-2fa */
  userId: string;
}

/**
 * Resposta de confirmação de 2FA.
 * Endpoint: POST /auth/confirm-2fa
 */
export interface Confirm2faResponse {
  /** Mensagem de sucesso (2FA ativado) */
  message: string;
  
  /** Indica que 2FA foi ativado com sucesso */
  success: boolean;
}
