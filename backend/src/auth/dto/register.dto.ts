import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Corpo esperado em POST /auth/register: dados mínimos para criar conta no StoreLab.
 */
export class RegisterDto {
  /** Nome exibido no jogo. */
  @IsString()
  name: string;

  /** E-mail único da conta. */
  @IsEmail()
  email: string;

  /**
   * Senha com tamanho mínimo para dificultar senhas triviais (o hash no banco não revela o comprimento real,
   * mas na entrada exigimos pelo menos 8 caracteres).
   */
  @IsString()
  @MinLength(8)
  password: string;

  /**
   * Facilitador ou jogador; se omitido, o serviço assume jogador — simplifica o formulário do participante comum.
   */
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
