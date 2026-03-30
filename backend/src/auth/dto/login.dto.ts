import { IsEmail, IsString } from 'class-validator';

/**
 * Corpo esperado em POST /auth/login: e-mail e senha já validados antes de chegar no serviço.
 */
export class LoginDto {
  /** Endereço usado no cadastro (formato de e-mail). */
  @IsEmail()
  email: string;

  /** Senha em texto só trafega até o servidor; no banco existe apenas o hash. */
  @IsString()
  password: string;
}
