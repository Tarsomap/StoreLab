import { IsString, IsUUID } from 'class-validator';

/**
 * Dados para abrir uma nova equipe-loja dentro de uma sessão (nome + sessão de destino).
 * O código de acesso é gerado no servidor — não vem no DTO para evitar códigos fracos ou duplicados à mão.
 */
export class CreateStoreDto {
  /** Nome da loja no jogo (ex.: “Loja Norte”). */
  @IsString()
  name: string;

  /** Partida à qual esta loja pertence. */
  @IsUUID()
  sessionId: string;
}
