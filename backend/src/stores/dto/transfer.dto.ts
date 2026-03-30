import { IsUUID } from 'class-validator';

/**
 * Pedido de transferência de jogador entre duas lojas da mesma sessão, feito pelo facilitador na reconfiguração.
 * No jogo, isso representa mover um especialista de uma unidade para outra quando a rede rebalanceia gente após uma rodada,
 * sem misturar times de partidas diferentes (por isso sessionId vem na URL, não no corpo).
 */
export class TransferDto {
  /** Loja que “libera” o jogador. */
  @IsUUID()
  fromStoreId: string;

  /** Quem será movido (deve já ser membro da loja de origem). */
  @IsUUID()
  userId: string;

  /** Loja que recebe o jogador (mesma sessão; não pode ser igual à origem). */
  @IsUUID()
  toStoreId: string;
}
