/**
 * Corpo para solicitar ativação de MFA.
 * Endpoint: POST /auth/enable-2fa
 * 
 * O servidor gerará o secret e QR code automaticamente.
 */
export class Enable2faDto {
  // Vazio — o endpoint não precisa de parâmetros do cliente.
  // O secret e QR code são gerados pelo servidor.
}
