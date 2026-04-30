import { IsString, Length } from 'class-validator';

/**
 * Corpo para confirmar ativação de MFA.
 * Endpoint: POST /auth/confirm-2fa
 * 
 * Cliente envia o código TOTP de 6 dígitos gerado pelo app de autenticação.
 */
export class Confirm2faDto {
  /**
   * Código TOTP de 6 dígitos gerado pelo Google Authenticator ou similar.
   * Deve ser validado com o secret temporário recebido em enable-2fa.
   */
  @IsString()
  @Length(6, 6)
  code: string;

  /**
   * Secret temporário recebido do endpoint enable-2fa.
   * Será validado e então salvo permanentemente no banco.
   */
  @IsString()
  secret: string;
}
