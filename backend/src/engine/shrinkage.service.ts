import { Injectable } from '@nestjs/common';
import {
  ShrinkageCategoryInput,
  ShrinkageCategoryResult,
  ShrinkageResult,
} from './interfaces';

/**
 * Aplica quebra e envelhecimento sobre estoque não vendido (principalmente na rodada 3).
 * Transforma unidades paradas em custo (dinheiro que “some” do resultado) para o EBITDA.
 */
@Injectable()
export class ShrinkageService {
  /**
   * Para cada categoria, multiplica o não vendido pelo custo unitário e pelas taxas de perda.
   *
   * Quebra (breakage) representa produto estragado ou danificado; envelhecimento (aging) representa
   * perda por tempo na prateleira ou obsolescência. Usamos custo × quantidade × taxa porque o prejuízo
   * no jogo é medido em reais de CMV “perdido”, não em unidades abstratas — assim conversa com o restante
   * do fluxo financeiro. Garantimos não vendido negativo com Math.max(0, …) para não inventar ganho por erro de dados.
   *
   * @param inputs - Por categoria: não vendido acumulado e taxas do cadastro.
   * @returns Detalhe por categoria e totais para o EBITDA.
   */
  compute(inputs: ShrinkageCategoryInput[]): ShrinkageResult {
    const categories: ShrinkageCategoryResult[] = inputs.map((input) => {
      const unsold = Math.max(0, input.totalUnsold);
      // Valor monetário da quebra: unidades não vendidas × custo × taxa de quebra (decimal).
      const breakageAmount = unsold * input.unitCost * input.breakageRate;
      // Mesma lógica para envelhecimento, com a taxa própria da categoria.
      const agingAmount = unsold * input.unitCost * input.agingRate;
      return {
        categoryId: input.categoryId,
        breakageAmount,
        agingAmount,
      };
    });

    const totalBreakage = categories.reduce((sum, c) => sum + c.breakageAmount, 0);
    const totalAging = categories.reduce((sum, c) => sum + c.agingAmount, 0);

    return { categories, totalBreakage, totalAging };
  }

  /**
   * Retorno neutro quando a rodada não aplica shrinkage (rodadas 1 e 2 no fluxo principal).
   * Mantém a mesma forma de objeto para o FinancialService não precisar de casos especiais.
   *
   * @returns Estrutura com listas e totais zerados.
   */
  empty(): ShrinkageResult {
    return {
      categories: [],
      totalBreakage: 0,
      totalAging: 0,
    };
  }
}
