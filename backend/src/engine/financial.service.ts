import { Injectable } from '@nestjs/common';
import {
  CategoryEngineInput,
  CategoryRevenueResult,
  CapexEngineInput,
  EbitdaInput,
  EbitdaBreakdown,
} from './interfaces';
import {
  MAINTENANCE_COST,
  INTEREST_RATE_MONTHLY,
} from './constants';

/**
 * Converte decisões de estoque e demanda em receita por categoria e monta o EBITDA da rodada.
 * Reúne impostos, folha, licenças, manutenção, juros, SLA e perdas de estoque num único resultado.
 */
@Injectable()
export class FinancialService {
  /**
   * Calcula quanto cada categoria vende nesta rodada e quanto sobra em estoque, com imposto e CMV.
   *
   * A demanda da loja (demandShare) limita quanto do estoque da sessão “circular”: maxSellable =
   * estoque disponível na sessão × fatia da loja. Não vendemos mais do que foi comprado nem acima desse teto.
   * Preço de venda = custo × (1 + margem). Receita bruta = vendas × preço; imposto = receita × alíquota;
   * CMV = vendas × custo unitário. Assim o jogo separa o que é faturamento, o que vai para o governo
   * e o que é custo direto do produto vendido.
   *
   * @param categories - Dados de compra, margem e imposto por categoria.
   * @param demandShare - Fatia de demanda desta loja (0 a 1) vinda do DemandService.
   * @returns Lista com vendas, não vendido, receita bruta, imposto e CMV por categoria.
   */
  computeCategoryRevenues(
    categories: CategoryEngineInput[],
    demandShare: number,
  ): CategoryRevenueResult[] {
    return categories.map((cat) => {
      // Teto de unidades que o mercado “libera” para esta loja nesta rodada.
      const maxSellable = cat.sessionStockAvailable * demandShare;
      const stockSold = Math.min(cat.stockPurchased, maxSellable);
      const unsoldStock = cat.stockPurchased - stockSold;
      const salePrice = cat.unitCost * (1 + cat.priceMargin);
      const grossRevenue = stockSold * salePrice;
      // Imposto sobre o que efetivamente faturamos nesta categoria.
      const taxAmount = grossRevenue * cat.taxRate;
      const costOfGoods = stockSold * cat.unitCost;
      return {
        categoryId: cat.categoryId,
        stockSold,
        unsoldStock,
        grossRevenue,
        taxAmount,
        costOfGoods,
      };
    });
  }

  /**
   * Agrega receitas e aplica todos os custos operacionais para chegar ao EBITDA e ao percentual sobre receita bruta.
   *
   * EBITDA aqui é: receita líquida (após imposto) − CMV − quebra − envelhecimento − folha − manutenção
   * − licenças − juros − perda de receita por SLA. Percentual = EBITDA ÷ receita bruta (0 se não houve receita,
   * para não dividir por zero). Juros incidem só sobre o caixa usado acima do interestThreshold, à taxa mensal,
   * porque o jogo modela capital acima de um patamar como financiado. FREEZER zera manutenção; licenças somam
   * o pacote base mais deltas dos CAPEX implementados.
   *
   * @param input - Receitas por categoria, pessoal, CAPEX, caixa, limite de juros, SLA e shrinkage.
   * @returns Objeto completo para gravar no RoundResult e exibir ao jogador.
   */
  computeEbitda(input: EbitdaInput): EbitdaBreakdown {
    const {
      categoryRevenues,
      cashierOperators,
      serviceOperators,
      cashierSalary,
      serviceSalary,
      baseLicenseCost,
      capexDecisions,
      cashUsed,
      interestThreshold,
      slaRevenueLost,
      shrinkage,
    } = input;

    const grossRevenue = categoryRevenues.reduce((sum, c) => sum + c.grossRevenue, 0);
    const taxAmount = categoryRevenues.reduce((sum, c) => sum + c.taxAmount, 0);
    const netRevenue = grossRevenue - taxAmount;
    const costOfGoods = categoryRevenues.reduce((sum, c) => sum + c.costOfGoods, 0);

    const breakageAmount = shrinkage.totalBreakage;
    const agingAmount = shrinkage.totalAging;

    // Folha: cada tipo de operador usa o salário configurado na sessão.
    const payrollCost =
      cashierOperators * cashierSalary + serviceOperators * serviceSalary;

    const hasFreezer = capexDecisions.some(
      (c) => c.type === 'FREEZER' && c.implemented,
    );
    // Com freezer, a manutenção de refrigeração embutida zera o custo fixo de manutenção do cenário base.
    const maintenanceCost = hasFreezer ? 0 : MAINTENANCE_COST;

    const licenseCost =
      baseLicenseCost +
      capexDecisions
        .filter((c) => c.implemented)
        .reduce((sum, c) => sum + c.monthlyLicenseDelta, 0);

    // Sobre o que excede o limite de caixa “grátis”, aplicamos juros; Math.max evita juro negativo.
    const interestCost = Math.max(0, cashUsed - interestThreshold) * INTEREST_RATE_MONTHLY;

    const ebitda =
      netRevenue -
      costOfGoods -
      breakageAmount -
      agingAmount -
      payrollCost -
      maintenanceCost -
      licenseCost -
      interestCost -
      slaRevenueLost;

    // Percentual em relação ao bruto: útil para ranking e para comparar lojas de tamanhos diferentes.
    const ebitdaPercentage = grossRevenue > 0 ? ebitda / grossRevenue : 0;

    return {
      categoryRevenues,
      grossRevenue,
      taxAmount,
      netRevenue,
      costOfGoods,
      breakageAmount,
      agingAmount,
      payrollCost,
      maintenanceCost,
      licenseCost,
      interestCost,
      slaRevenueLost,
      ebitda,
      ebitdaPercentage,
    };
  }
}
