import { IsEnum, IsString } from 'class-validator';
import { StoreRole } from '@prisma/client';

/**
 * Corpo para o jogador entrar na loja com o código que o facilitador/time divulgou e escolher um papel livre.
 * Cada papel só pode ter uma pessoa — espelha um time de varejo com responsabilidades fixas (suprimentos, loja, etc.).
 */
export class JoinStoreDto {
  /** Código curto gerado na criação da loja. */
  @IsString()
  accessCode: string;

  /** Qual cadeira o jogador quer ocupar; o servidor recusa se já estiver tomada. */
  @IsEnum(StoreRole)
  role: StoreRole;
}
