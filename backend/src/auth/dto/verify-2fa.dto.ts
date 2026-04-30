import { IsString, IsUUID, Length } from 'class-validator';

/**
 * Corpo para verificar código TOTP durante login.
 * Endpoint: POST /auth/verify-2fa
 * 
 * Cliente envia o código gerado pelo app após receber mfaRequired: true no login.
 */
export class Verify2faDto {
  /**
   * UUID do usuário que precisa verificar o código.
   * Recebido na resposta do login quando mfaRequired === true.
   */
  @IsUUID()
  userId: string;

  /**
   * Código TOTP de 6 dígitos gerado pelo Google Authenticator ou similar.
   */
  @IsString()
  @Length(6, 6)
  code: string;
}
