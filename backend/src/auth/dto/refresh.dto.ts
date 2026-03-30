import { IsString } from 'class-validator';

/**
 * Corpo esperado em POST /auth/refresh — na prática o refresh token que o cliente guardou após login.
 */
export class RefreshDto {
  /** Token longo emitido no login/registro; o servidor confere assinatura e hash no banco antes de gerar JWT novo. */
  @IsString()
  refreshToken: string;
}
