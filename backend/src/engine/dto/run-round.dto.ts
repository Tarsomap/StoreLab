import { IsString, IsInt, Min, Max } from 'class-validator';

/**
 * Corpo da requisição POST `/engine/run-round`.
 * O facilitador informa qual sessão e qual rodada devem ser recalculadas.
 */
export class RunRoundDto {
  /** Identificador único da sessão de jogo no banco. */
  @IsString()
  sessionId!: string;

  /** Número da rodada: 1, 2 ou 3 (limites garantem que não venha valor inválido). */
  @IsInt()
  @Min(1)
  @Max(3)
  round!: number;
}
