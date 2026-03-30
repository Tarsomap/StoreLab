import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { GameGateway } from '../gateway/game.gateway';
import { CsatService } from './csat.service';
import { DemandService } from './demand.service';
import { ShrinkageService } from './shrinkage.service';
import { FinancialService } from './financial.service';
import { SlaService } from './sla.service';
import {
  CategoryEngineInput,
  CapexEngineInput,
  StoreIndicators,
  ShrinkageCategoryInput,
} from './interfaces';

/**
 * Orquestra o cálculo de uma rodada: carrega sessão e planos, chama cada subserviço na ordem correta
 * e grava resultados no banco, além de avisar o front em tempo real (SLA e fim da rodada).
 */
@Injectable()
export class EngineService {
  /**
   * Injeta persistência, gateway e os serviços de domínio do motor (CSAT, demanda, financeiro, etc.).
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameGateway: GameGateway,
    private readonly csatService: CsatService,
    private readonly demandService: DemandService,
    private readonly shrinkageService: ShrinkageService,
    private readonly financialService: FinancialService,
    private readonly slaService: SlaService,
  ) {}

  /**
   * Executa o pipeline completo da rodada para todas as lojas da sessão.
   *
   * Fluxo resumido: (1) carregar plano certo (versão 1 na rodada 1, versão 2 nas demais);
   * (2) montar entradas por loja (categorias, CAPEX, caixa usado, nota do quiz);
   * (3) calcular indicadores e demanda; (4) receita por categoria e SLA sobre receita bruta;
   * (5) na rodada 3, shrinkage com estoque não vendido acumulado; (6) limite de juros conforme regra
   * pós-rodada 1; (7) EBITDA; (8) upsert em roundResult e slaEvent; (9) emitir resultados via WebSocket.
   *
   * @param sessionId - Sessão a processar.
   * @param round - 1, 2 ou 3.
   * @throws NotFoundException se a sessão não existir.
   */
  async runRound(sessionId: string, round: number): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        stores: {
          include: {
            plans: {
              include: {
                categoryDecisions: { include: { category: true } },
                capexDecisions: { include: { capexOption: true } },
              },
            },
            quizAnswers: true,
          },
        },
        categoryConfigs: { include: { category: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Rodada 1 usa configuração/plano versão 1; rodadas 2 e 3 usam versão 2 (reconfiguração do jogo).
    const configVersion = round === 1 ? 1 : 2;

    const storeInputs: {
      storeId: string;
      categories: CategoryEngineInput[];
      capexDecisions: CapexEngineInput[];
      cashierOperators: number;
      serviceOperators: number;
      cashUsed: number;
      quizScorePercentage: number;
    }[] = [];

    for (const store of session.stores) {
      const plan = store.plans.find((p) => p.configVersion === configVersion);
      if (!plan) continue;

      const quizAnswer = store.quizAnswers.find((q) => q.round === round);
      // Banco guarda percentual 0–100; o motor usa decimal 0–1 para combinar com CSAT e limites.
      const quizScorePercentage = quizAnswer ? quizAnswer.scorePercentage / 100 : 0;

      const categories: CategoryEngineInput[] = plan.categoryDecisions.map((dec) => {
        const sessionConfig = session.categoryConfigs.find(
          (c) => c.categoryId === dec.categoryId,
        );
        // Facilitador pode ajustar estoque global da sessão; se não houver, cai no padrão da categoria.
        const sessionStockAvailable =
          sessionConfig?.stockAvailable ?? dec.category.stockAvailable;

        return {
          categoryId: dec.categoryId,
          categoryName: dec.category.name,
          unitCost: dec.category.unitCost,
          taxRate: dec.category.taxRate,
          breakageRate: dec.category.breakageRate,
          agingRate: dec.category.agingRate,
          sessionStockAvailable,
          stockPurchased: dec.stockPurchased,
          priceMargin: dec.priceMargin,
        };
      });

      const capexDecisions: CapexEngineInput[] = plan.capexDecisions.map((dec) => ({
        capexOptionId: dec.capexOptionId,
        type: dec.capexOption.type,
        acquisitionCost: dec.capexOption.acquisitionCost,
        downtimeFixedDays: dec.capexOption.downtimeFixedDays,
        monthlyLicenseDelta: dec.capexOption.monthlyLicenseDelta,
        maintenanceSaving: dec.capexOption.maintenanceSaving,
        slaRiskPercent: dec.capexOption.slaRiskPercent,
        implemented: dec.implemented,
      }));

      // Caixa usado na rodada = compra de estoque + CAPEX efetivamente implementado (saída de caixa).
      const stockCost = categories.reduce(
        (sum, c) => sum + c.stockPurchased * c.unitCost,
        0,
      );
      const capexCost = capexDecisions
        .filter((c) => c.implemented)
        .reduce((sum, c) => sum + c.acquisitionCost, 0);
      const cashUsed = stockCost + capexCost;

      storeInputs.push({
        storeId: store.id,
        categories,
        capexDecisions,
        cashierOperators: plan.cashierOperators,
        serviceOperators: plan.serviceOperators,
        cashUsed,
        quizScorePercentage,
      });
    }

    const storeIndicators: StoreIndicators[] = storeInputs.map((s) => ({
      storeId: s.storeId,
      csat: this.csatService.calculate(s.cashierOperators, s.quizScorePercentage),
      availability: this.demandService.computeAvailability(s.categories),
      basketPrice: this.demandService.computeBasketPrice(s.categories),
    }));

    const demandResults = this.demandService.computeDemand(storeIndicators);

    for (const storeInput of storeInputs) {
      const demandResult = demandResults.find((d) => d.storeId === storeInput.storeId);
      if (!demandResult) continue;

      const indicators = storeIndicators.find((i) => i.storeId === storeInput.storeId)!;

      const categoryRevenues = this.financialService.computeCategoryRevenues(
        storeInput.categories,
        demandResult.demandShare,
      );

      const grossRevenueBeforeSla = categoryRevenues.reduce(
        (sum, c) => sum + c.grossRevenue,
        0,
      );

      // SLA usa a receita bruta antes de “descontar” a perda — é a base para estimar perda diária.
      const slaResult = this.slaService.computeEvents({
        sessionId,
        storeId: storeInput.storeId,
        round,
        serviceOperators: storeInput.serviceOperators,
        capexDecisions: storeInput.capexDecisions,
        grossRevenue: grossRevenueBeforeSla,
      });

      let shrinkageResult = this.shrinkageService.empty();
      if (round === 3) {
        const shrinkageInputs = await this.buildShrinkageInputs(
          sessionId,
          storeInput.storeId,
          storeInput.categories,
          categoryRevenues,
        );
        shrinkageResult = this.shrinkageService.compute(shrinkageInputs);
      }

      const interestThreshold = await this.computeInterestThreshold(
        session.initialCash,
        sessionId,
        storeInput.storeId,
        round,
      );

      const ebitdaBreakdown = this.financialService.computeEbitda({
        categoryRevenues,
        cashierOperators: storeInput.cashierOperators,
        serviceOperators: storeInput.serviceOperators,
        capexDecisions: storeInput.capexDecisions,
        cashUsed: storeInput.cashUsed,
        interestThreshold,
        slaRevenueLost: slaResult.totalRevenueLost,
        shrinkage: shrinkageResult,
      });

      await this.prisma.roundResult.upsert({
        where: { storeId_round: { storeId: storeInput.storeId, round } },
        create: {
          storeId: storeInput.storeId,
          sessionId,
          round,
          csat: indicators.csat,
          availability: indicators.availability,
          basketPrice: indicators.basketPrice,
          rankScore: demandResult.rankScore,
          demandShare: demandResult.demandShare,
          grossRevenue: ebitdaBreakdown.grossRevenue,
          taxAmount: ebitdaBreakdown.taxAmount,
          netRevenue: ebitdaBreakdown.netRevenue,
          costOfGoods: ebitdaBreakdown.costOfGoods,
          breakageAmount: ebitdaBreakdown.breakageAmount,
          agingAmount: ebitdaBreakdown.agingAmount,
          payrollCost: ebitdaBreakdown.payrollCost,
          maintenanceCost: ebitdaBreakdown.maintenanceCost,
          licenseCost: ebitdaBreakdown.licenseCost,
          interestCost: ebitdaBreakdown.interestCost,
          slaRevenueLost: ebitdaBreakdown.slaRevenueLost,
          ebitda: ebitdaBreakdown.ebitda,
          ebitdaPercentage: ebitdaBreakdown.ebitdaPercentage,
          cashUsed: storeInput.cashUsed,
        },
        update: {
          csat: indicators.csat,
          availability: indicators.availability,
          basketPrice: indicators.basketPrice,
          rankScore: demandResult.rankScore,
          demandShare: demandResult.demandShare,
          grossRevenue: ebitdaBreakdown.grossRevenue,
          taxAmount: ebitdaBreakdown.taxAmount,
          netRevenue: ebitdaBreakdown.netRevenue,
          costOfGoods: ebitdaBreakdown.costOfGoods,
          breakageAmount: ebitdaBreakdown.breakageAmount,
          agingAmount: ebitdaBreakdown.agingAmount,
          payrollCost: ebitdaBreakdown.payrollCost,
          maintenanceCost: ebitdaBreakdown.maintenanceCost,
          licenseCost: ebitdaBreakdown.licenseCost,
          interestCost: ebitdaBreakdown.interestCost,
          slaRevenueLost: ebitdaBreakdown.slaRevenueLost,
          ebitda: ebitdaBreakdown.ebitda,
          ebitdaPercentage: ebitdaBreakdown.ebitdaPercentage,
          cashUsed: storeInput.cashUsed,
        },
      });

      for (const event of slaResult.events) {
        await this.prisma.slaEvent.upsert({
          where: {
            storeId_capexOptionId_round: {
              storeId: storeInput.storeId,
              capexOptionId: event.capexOptionId,
              round,
            },
          },
          create: {
            sessionId,
            storeId: storeInput.storeId,
            capexOptionId: event.capexOptionId,
            round,
            occurred: event.occurred,
            daysDown: event.daysDown,
            revenueLost: event.revenueLost,
          },
          update: {
            occurred: event.occurred,
            daysDown: event.daysDown,
            revenueLost: event.revenueLost,
          },
        });

        if (event.occurred) {
          this.gameGateway.emitSlaEvent(storeInput.storeId, {
            capexOptionId: event.capexOptionId,
            capexType: event.capexType,
            daysDown: event.daysDown,
            revenueLost: event.revenueLost,
            round,
          });
        }
      }
    }

    // Notifica a sala da sessão com o ranking/valores recém-calculados para atualizar dashboards ao vivo.
    const savedResults = await this.prisma.roundResult.findMany({
      where: { sessionId, round },
      include: { store: { select: { name: true } } },
    });
    this.gameGateway.emitRoundResults(sessionId, savedResults);
  }

  /**
   * Monta, para a rodada 3, o estoque não vendido acumulado por categoria.
   *
   * Somamos: (a) não vendido desta rodada (vem das receitas por categoria); (b) para cada plano anterior
   * (versões 1 e 2), estimamos não vendido usando a demanda da rodada correspondente ao configVersion do plano.
   * A fórmula sold = comprado × demandShare daquele resultado aproxima quantas unidades saíram; o que sobrou
   * incrementa o acumulado. Assim o shrinkage final pune estoque parado ao longo do jogo, não só o da última compra.
   *
   * @param sessionId - Sessão (escopo dos resultados anteriores).
   * @param storeId - Loja analisada.
   * @param currentCategories - Metadados atuais por categoria (taxas e custo).
   * @param currentCategoryRevenues - Inclui unsoldStock desta rodada por categoria.
   * @returns Lista pronta para o ShrinkageService.
   */
  private async buildShrinkageInputs(
    sessionId: string,
    storeId: string,
    currentCategories: CategoryEngineInput[],
    currentCategoryRevenues: { categoryId: string; unsoldStock: number }[],
  ): Promise<ShrinkageCategoryInput[]> {
    const prevResults = await this.prisma.roundResult.findMany({
      where: { storeId, round: { in: [1, 2] }, sessionId },
    });

    const prevPlans = await this.prisma.operationalPlan.findMany({
      where: { storeId, configVersion: { in: [1, 2] } },
      include: {
        categoryDecisions: true,
      },
    });

    const unsoldByCategory = new Map<string, number>();
    for (const cat of currentCategoryRevenues) {
      const current = unsoldByCategory.get(cat.categoryId) ?? 0;
      unsoldByCategory.set(cat.categoryId, current + cat.unsoldStock);
    }

    for (const plan of prevPlans) {
      const result = prevResults.find(
        (r) => r.round === plan.configVersion,
      );
      if (!result) continue;

      for (const dec of plan.categoryDecisions) {
        // Sem CMV na rodada de referência, tratamos como nada vendido (evita divisão estranha).
        const sold = result.costOfGoods > 0
          ? dec.stockPurchased * (result.demandShare)
          : 0;
        const actualSold = Math.min(dec.stockPurchased, sold);
        const unsold = dec.stockPurchased - actualSold;
        const current = unsoldByCategory.get(dec.categoryId) ?? 0;
        unsoldByCategory.set(dec.categoryId, current + Math.max(0, unsold));
      }
    }

    return currentCategories.map((cat) => ({
      categoryId: cat.categoryId,
      unitCost: cat.unitCost,
      breakageRate: cat.breakageRate,
      agingRate: cat.agingRate,
      totalUnsold: unsoldByCategory.get(cat.categoryId) ?? 0,
    }));
  }

  /**
   * Define até quanto de caixa usado não gera juros nesta rodada.
   *
   * Na rodada 1 o limite é simplesmente o caixa inicial da sessão — ainda não há histórico.
   * Nas rodadas seguintes, partimos do caixa inicial, subtraímos o que a loja já gastou na rodada 1
   * e somamos o custo dos CAPEX da versão 1 do plano que ficaram só no papel (não implementados),
   * porque esse dinheiro “não saiu” e volta a compor o colchão para cálculo de juros, alinhado à regra do jogo.
   *
   * @param initialCash - Caixa inicial da sessão.
   * @param sessionId - Sessão.
   * @param storeId - Loja.
   * @param round - Rodada atual.
   * @returns Valor-limite (threshold) em reais para a fórmula de juros do FinancialService.
   */
  private async computeInterestThreshold(
    initialCash: number,
    sessionId: string,
    storeId: string,
    round: number,
  ): Promise<number> {
    if (round === 1) {
      return initialCash;
    }

    const round1Result = await this.prisma.roundResult.findUnique({
      where: { storeId_round: { storeId, round: 1 } },
    });

    if (!round1Result) {
      return initialCash;
    }

    const plan1 = await this.prisma.operationalPlan.findUnique({
      where: { storeId_configVersion: { storeId, configVersion: 1 } },
      include: { capexDecisions: { include: { capexOption: true } } },
    });

    // CAPEX previsto mas não comprado na v1 não consumiu caixa — recompõe o limite para juros nas rodadas 2 e 3.
    const unimplementedCapexCost = plan1
      ? plan1.capexDecisions
          .filter((d) => !d.implemented)
          .reduce((sum, d) => sum + d.capexOption.acquisitionCost, 0)
      : 0;

    return initialCash - round1Result.cashUsed + unimplementedCapexCost;
  }
}
