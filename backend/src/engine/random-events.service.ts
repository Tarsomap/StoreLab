import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  CapexEngineInput,
  RandomEventDefinition,
  RandomEventOccurrence,
  RandomEventsPreResult,
  ResolvedEventImpact,
  SessionWideEvents,
} from './interfaces';
import {
  IDEAL_CASHIER_OPERATORS,
  RANDOM_EVENT_FINE_REGULATORY,
  RANDOM_EVENT_FINE_CYBER_ATTACK,
  RANDOM_EVENT_FINE_DATA_BREACH,
  RANDOM_EVENT_CSAT_PENALTY_REPUTATION,
  RANDOM_EVENT_CSAT_PENALTY_DATA_BREACH,
  RANDOM_EVENT_DEMAND_PENALTY_COMPETITOR,
  RANDOM_EVENT_INVENTORY_LOSS_CONTAMINATION,
  RANDOM_EVENT_INVENTORY_LOSS_THEFT,
  RANDOM_EVENT_STOCK_REDUCTION_LOGISTICS,
  RANDOM_EVENT_CLIMATE_INVENTORY_LOSS,
  RANDOM_EVENT_CLIMATE_DEMAND_REDUCTION,
  RANDOM_EVENT_COST_INCREASE_PERCENT,
  RANDOM_EVENT_DEMAND_SURGE_PERCENT,
  RANDOM_EVENT_DAYS_OPERATIONAL_FAILURE,
  RANDOM_EVENT_DAYS_POWER_OUTAGE,
  RANDOM_EVENT_DAYS_PAYMENT_FAILURE,
  RANDOM_EVENT_DAYS_CYBER_ATTACK,
  RANDOM_EVENT_RISK_CLIMATE,
  RANDOM_EVENT_RISK_COST_INCREASE,
  RANDOM_EVENT_RISK_DEMAND_SURGE,
} from './constants';

const ZERO_IMPACT: ResolvedEventImpact = {
  daysDown: 0,
  revenueLost: 0,
  penaltyAmount: 0,
  csatPenalty: 0,
  overflowCsatPenalty: 0,
  demandPenaltyFactor: 0,
  demandBonusFactor: 0,
  inventoryLossAllPercent: 0,
  inventoryLossPereciveisPercent: 0,
  stockReductionPercent: 0,
  costIncreasePercent: 0,
};

const EVENT_DEFINITIONS: RandomEventDefinition[] = [
  {
    type: 'OPERATIONAL_FAILURE',
    label: 'Falha Operacional',
    description: 'Processos manuais sem automação geraram falhas nas operações da loja nesta rodada.',
    protectingCapex: ['AUTOMATION'],
    baseRiskPercent: 0.15,
    scope: 'store',
  },
  {
    type: 'REGULATORY_CHANGE',
    label: 'Mudança Regulatória',
    description: 'Uma fiscalização identificou irregularidades e aplicou multa à loja.',
    protectingCapex: ['SECURITY', 'FREEZER'],
    baseRiskPercent: 0.15,
    scope: 'store',
  },
  {
    type: 'COMPETITOR_PROMOTION',
    label: 'Promoção Agressiva da Concorrência',
    description: 'Um concorrente lançou promoção agressiva e reduziu a captação de demanda da sua loja.',
    protectingCapex: ['SITE', 'SELF_CHECKOUT'],
    baseRiskPercent: 0.20,
    scope: 'store',
  },
  {
    type: 'REPUTATION_DAMAGE',
    label: 'Repercussão Negativa',
    description: 'A loja sofreu repercussão negativa nas redes sociais, afetando a satisfação dos clientes.',
    protectingCapex: ['SITE', 'SECURITY'],
    baseRiskPercent: 0.15,
    scope: 'store',
  },
  {
    type: 'LOT_CONTAMINATION',
    label: 'Contaminação de Lote',
    description: 'Um lote de perecíveis foi contaminado e precisou ser descartado antes da venda.',
    protectingCapex: ['FREEZER'],
    baseRiskPercent: 0.10,
    scope: 'store',
  },
  {
    type: 'INVENTORY_THEFT',
    label: 'Furto de Inventário',
    description: 'Furto interno ou externo resultou em perda de estoque em todas as categorias.',
    protectingCapex: ['SECURITY'],
    baseRiskPercent: 0.15,
    scope: 'store',
  },
  {
    type: 'PAYMENT_SYSTEM_FAILURE',
    label: 'Falha no Sistema de Pagamentos',
    description: 'Instabilidade na rede causou falha nos sistemas de pagamento, paralisando as operações.',
    protectingCapex: ['NETWORK'],
    baseRiskPercent: 0.05,
    scope: 'store',
  },
  {
    type: 'CYBER_ATTACK',
    label: 'Ataque Cibernético',
    description: 'A loja sofreu um ataque cibernético que causou indisponibilidade e multa regulatória.',
    protectingCapex: ['SECURITY', 'NETWORK'],
    baseRiskPercent: 0.20,
    scope: 'store',
  },
  {
    type: 'DATA_BREACH',
    label: 'Vazamento de Dados',
    description: 'Dados de clientes foram expostos, gerando multa por LGPD e queda na reputação.',
    protectingCapex: ['SECURITY'],
    baseRiskPercent: 0.15,
    scope: 'store',
  },
  {
    type: 'LOGISTICS_PROBLEM',
    label: 'Problema Logístico',
    description: 'Falhas nos processos de distribuição impediram o recebimento completo do pedido.',
    protectingCapex: ['AUTOMATION'],
    baseRiskPercent: 0.15,
    scope: 'store',
  },
  {
    type: 'POWER_OUTAGE',
    label: 'Queda de Energia',
    description: 'Queda de energia paralisou as operações da loja por alguns dias.',
    protectingCapex: ['NETWORK', 'AUTOMATION'],
    baseRiskPercent: 0.10,
    scope: 'store',
  },
  {
    type: 'DEMAND_SURGE',
    label: 'Aumento Inesperado de Demanda',
    description: 'Um evento externo gerou aumento na procura. Lojas preparadas capturam mais; as despreparadas sofrem com filas.',
    protectingCapex: [],
    baseRiskPercent: RANDOM_EVENT_RISK_DEMAND_SURGE,
    scope: 'store',
  },
  {
    type: 'CLIMATE_EVENT',
    label: 'Evento Climático',
    description: 'Condições climáticas adversas afetaram o estoque de perecíveis e reduziram o fluxo de clientes.',
    protectingCapex: [],
    baseRiskPercent: RANDOM_EVENT_RISK_CLIMATE,
    scope: 'session',
  },
  {
    type: 'INPUT_COST_INCREASE',
    label: 'Aumento no Custo de Insumos',
    description: 'Alta global no custo de matérias-primas elevou o CMV de todas as categorias nesta rodada.',
    protectingCapex: [],
    baseRiskPercent: RANDOM_EVENT_RISK_COST_INCREASE,
    scope: 'session',
  },
];

@Injectable()
export class RandomEventsService {
  /** Hash SHA-256 determinístico retornando valor em [0, 1). */
  private hash(seed: string): number {
    const h = crypto.createHash('sha256').update(seed).digest('hex');
    return parseInt(h.slice(0, 8), 16) / 0xffffffff;
  }

  /**
   * Calcula o risco real de um evento considerando os CAPEXes protetores implementados.
   * Cada CAPEX implementado reduz proporcionalmente: todos implementados → risco zero.
   */
  computeRisk(def: RandomEventDefinition, capexDecisions: CapexEngineInput[]): number {
    if (def.protectingCapex.length === 0) return def.baseRiskPercent;
    const implementedCount = def.protectingCapex.filter((type) =>
      capexDecisions.some((d) => d.type === type && d.implemented),
    ).length;
    return def.baseRiskPercent * (1 - implementedCount / def.protectingCapex.length);
  }

  /**
   * Sorteia os eventos de sessão (clima e custo de insumos) uma única vez por rodada.
   * Seed sem storeId garante que todas as lojas recebam o mesmo resultado.
   */
  computeSessionWideEvents(sessionId: string, round: number): SessionWideEvents {
    const climateR = this.hash(`${sessionId}-${round}-CLIMATE_EVENT`);
    const costR = this.hash(`${sessionId}-${round}-INPUT_COST_INCREASE`);
    return {
      climateOccurred: climateR < RANDOM_EVENT_RISK_CLIMATE,
      costIncreaseOccurred: costR < RANDOM_EVENT_RISK_COST_INCREASE,
    };
  }

  /**
   * Calcula os modificadores de eventos para uma loja antes de conhecer a receita bruta.
   * Downtime é retornado em dias; revenueLost é calculado pelo engine com a receita real.
   */
  computePreModifiers(input: {
    sessionId: string;
    storeId: string;
    round: number;
    capexDecisions: CapexEngineInput[];
    cashierOperators: number;
    sessionWideEvents: SessionWideEvents;
  }): RandomEventsPreResult {
    const { sessionId, storeId, round, capexDecisions, cashierOperators, sessionWideEvents } = input;

    const occurrences: RandomEventOccurrence[] = [];
    let csatPenalty = 0;
    let overflowCsatPenalty = 0;
    let demandPenaltyFactor = 0;
    let demandBonusFactor = 0;
    let inventoryLossAllPercent = 0;
    let inventoryLossPereciveisPercent = 0;
    let stockReductionPercent = 0;
    let costIncreasePercent = 0;
    let fixedPenaltyAmount = 0;
    let downtimeEventsDays = 0;

    // ── Eventos por loja ────────────────────────────────────────────────────────
    for (const def of EVENT_DEFINITIONS.filter((d) => d.scope === 'store')) {
      const r = this.hash(`${sessionId}-${storeId}-${round}-${def.type}`);
      const risk = this.computeRisk(def, capexDecisions);
      const occurred = r < risk;
      const impact: ResolvedEventImpact = { ...ZERO_IMPACT };

      if (occurred) {
        switch (def.type) {
          case 'OPERATIONAL_FAILURE':
            impact.daysDown = RANDOM_EVENT_DAYS_OPERATIONAL_FAILURE;
            downtimeEventsDays += impact.daysDown;
            break;

          case 'REGULATORY_CHANGE':
            impact.penaltyAmount = RANDOM_EVENT_FINE_REGULATORY;
            fixedPenaltyAmount += impact.penaltyAmount;
            break;

          case 'COMPETITOR_PROMOTION':
            impact.demandPenaltyFactor = RANDOM_EVENT_DEMAND_PENALTY_COMPETITOR;
            demandPenaltyFactor = Math.min(1, demandPenaltyFactor + impact.demandPenaltyFactor);
            break;

          case 'REPUTATION_DAMAGE':
            impact.csatPenalty = RANDOM_EVENT_CSAT_PENALTY_REPUTATION;
            csatPenalty += impact.csatPenalty;
            break;

          case 'LOT_CONTAMINATION':
            impact.inventoryLossPereciveisPercent = RANDOM_EVENT_INVENTORY_LOSS_CONTAMINATION;
            inventoryLossPereciveisPercent = Math.min(
              1,
              inventoryLossPereciveisPercent + impact.inventoryLossPereciveisPercent,
            );
            break;

          case 'INVENTORY_THEFT':
            impact.inventoryLossAllPercent = RANDOM_EVENT_INVENTORY_LOSS_THEFT;
            inventoryLossAllPercent = Math.min(1, inventoryLossAllPercent + impact.inventoryLossAllPercent);
            break;

          case 'PAYMENT_SYSTEM_FAILURE':
            impact.daysDown = RANDOM_EVENT_DAYS_PAYMENT_FAILURE;
            downtimeEventsDays += impact.daysDown;
            break;

          case 'CYBER_ATTACK':
            impact.daysDown = RANDOM_EVENT_DAYS_CYBER_ATTACK;
            impact.penaltyAmount = RANDOM_EVENT_FINE_CYBER_ATTACK;
            downtimeEventsDays += impact.daysDown;
            fixedPenaltyAmount += impact.penaltyAmount;
            break;

          case 'DATA_BREACH':
            impact.csatPenalty = RANDOM_EVENT_CSAT_PENALTY_DATA_BREACH;
            impact.penaltyAmount = RANDOM_EVENT_FINE_DATA_BREACH;
            csatPenalty += impact.csatPenalty;
            fixedPenaltyAmount += impact.penaltyAmount;
            break;

          case 'LOGISTICS_PROBLEM':
            impact.stockReductionPercent = RANDOM_EVENT_STOCK_REDUCTION_LOGISTICS;
            stockReductionPercent = Math.min(1, stockReductionPercent + impact.stockReductionPercent);
            break;

          case 'POWER_OUTAGE':
            impact.daysDown = RANDOM_EVENT_DAYS_POWER_OUTAGE;
            downtimeEventsDays += impact.daysDown;
            break;

          case 'DEMAND_SURGE': {
            const hasSelfCheckout = capexDecisions.some((d) => d.type === 'SELF_CHECKOUT' && d.implemented);
            const cashierFactor = Math.min(1, cashierOperators / IDEAL_CASHIER_OPERATORS);
            // Sem Self Checkout, capacidade absorve apenas 60% × fator de caixas disponíveis.
            const capacityFactor = hasSelfCheckout ? 1.0 : cashierFactor * 0.6;
            impact.demandBonusFactor = RANDOM_EVENT_DEMAND_SURGE_PERCENT * capacityFactor;
            // Demanda não absorvida gera filas → penalidade de CSAT proporcional ao excedente.
            impact.overflowCsatPenalty = RANDOM_EVENT_DEMAND_SURGE_PERCENT * (1 - capacityFactor) * 0.1;
            demandBonusFactor += impact.demandBonusFactor;
            overflowCsatPenalty += impact.overflowCsatPenalty;
            break;
          }
        }
      }

      occurrences.push({ type: def.type, label: def.label, description: def.description, occurred, impact });
    }

    // ── Eventos de sessão (replicados por loja com o mesmo resultado) ───────────
    const climateImpact: ResolvedEventImpact = { ...ZERO_IMPACT };
    if (sessionWideEvents.climateOccurred) {
      climateImpact.inventoryLossPereciveisPercent = RANDOM_EVENT_CLIMATE_INVENTORY_LOSS;
      climateImpact.demandPenaltyFactor = RANDOM_EVENT_CLIMATE_DEMAND_REDUCTION;
      inventoryLossPereciveisPercent = Math.min(1, inventoryLossPereciveisPercent + RANDOM_EVENT_CLIMATE_INVENTORY_LOSS);
      demandPenaltyFactor = Math.min(1, demandPenaltyFactor + RANDOM_EVENT_CLIMATE_DEMAND_REDUCTION);
    }
    const climateDef = EVENT_DEFINITIONS.find((d) => d.type === 'CLIMATE_EVENT')!;
    occurrences.push({
      type: 'CLIMATE_EVENT',
      label: climateDef.label,
      description: climateDef.description,
      occurred: sessionWideEvents.climateOccurred,
      impact: climateImpact,
    });

    const costImpact: ResolvedEventImpact = { ...ZERO_IMPACT };
    if (sessionWideEvents.costIncreaseOccurred) {
      costImpact.costIncreasePercent = RANDOM_EVENT_COST_INCREASE_PERCENT;
      costIncreasePercent += RANDOM_EVENT_COST_INCREASE_PERCENT;
    }
    const costDef = EVENT_DEFINITIONS.find((d) => d.type === 'INPUT_COST_INCREASE')!;
    occurrences.push({
      type: 'INPUT_COST_INCREASE',
      label: costDef.label,
      description: costDef.description,
      occurred: sessionWideEvents.costIncreaseOccurred,
      impact: costImpact,
    });

    return {
      csatPenalty: Math.min(1, csatPenalty),
      overflowCsatPenalty: Math.min(1, overflowCsatPenalty),
      demandPenaltyFactor: Math.min(1, demandPenaltyFactor),
      demandBonusFactor,
      inventoryLossAllPercent: Math.min(1, inventoryLossAllPercent),
      inventoryLossPereciveisPercent: Math.min(1, inventoryLossPereciveisPercent),
      stockReductionPercent: Math.min(1, stockReductionPercent),
      costIncreasePercent,
      fixedPenaltyAmount,
      downtimeEventsDays,
      occurrences,
    };
  }

  /** Retorna as definições de eventos — usado nos testes. */
  getDefinitions(): RandomEventDefinition[] {
    return EVENT_DEFINITIONS;
  }
}
