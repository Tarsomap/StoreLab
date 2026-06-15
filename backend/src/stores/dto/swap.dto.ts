import { IsUUID } from 'class-validator';

/**
 * Pedido de troca recíproca de dois jogadores entre duas lojas da mesma sessão, feito pelo facilitador na reconfiguração.
 *
 * Diferente da transferência unidirecional, o swap existe para o caso de **duas lojas cheias** (cinco papéis preenchidos):
 * mover um único jogador falharia porque o papel já estaria ocupado no destino. A troca recíproca resolve o impasse
 * movendo os dois ao mesmo tempo — e, por isso, exige que ambos tenham o **mesmo papel**, preservando o invariante de papel único por loja.
 */
export class SwapDto {
  /** Primeiro jogador da troca (deve ser membro de uma loja da sessão). */
  @IsUUID()
  userAId: string;

  /** Segundo jogador da troca (deve ser membro de OUTRA loja da mesma sessão e ter o mesmo papel de A). */
  @IsUUID()
  userBId: string;
}
