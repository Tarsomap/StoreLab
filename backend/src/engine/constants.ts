/**
 * Constantes numéricas usadas pelo motor de cálculo do jogo.
 * Centralizamos aqui para o simulador ficar alinhado à especificação (spec.md)
 * e para não espalhar números mágicos pelos serviços.
 */

/** Número ideal de operadores de caixa na loja (referência para o CSAT). */
export const IDEAL_CASHIER_OPERATORS = 10;

/** Caixa inicial da sessão, em reais (base para juros sobre uso acima do limite). */
export const INITIAL_CASH = 700_000;

/**
 * Taxa de juros mensal sobre o valor que ultrapassa o limite de caixa (12% ao mês).
 * Usamos decimal (0,12) porque as fórmulas multiplicam direto pelo valor em reais.
 */
export const INTEREST_RATE_MONTHLY = 0.12;

// Licenças de software fixas — sempre ativas, independente de CAPEX (spec.md §8)
/** Licença do sistema operacional, em R$/mês. */
export const LIC_OS = 120; // Sistema Operacional: R$120/mês
/** Licença do PDV base (1 equipamento), em R$/mês. */
export const LIC_PDV = 80; // PDV base (1 equipamento): R$80/mês
/** Licença do site, em R$/mês. */
export const LIC_SITE = 500; // Site: R$500/mês
/** Licença de segurança, em R$/mês. */
export const LIC_SECURITY = 500; // Sistemas de Segurança: R$500/mês
// Acréscimos via CAPEX ficam em capexOption.monthlyLicenseDelta (seed):
//   SECURITY → +R$100  |  SITE → +R$150  |  SELF_CHECKOUT → +R$320 (4 × R$80)
/** Soma das licenças fixas (OS + PDV + site + segurança), antes dos deltas de CAPEX. */
export const BASE_LICENSE_COST = LIC_OS + LIC_PDV + LIC_SITE + LIC_SECURITY; // = 1200

/** Salário mensal de um operador de caixa, em reais. */
export const CASHIER_SALARY = 1_000;

/** Salário mensal de um operador de atendimento/serviço, em reais. */
export const SERVICE_SALARY = 1_200;

/**
 * Custo fixo mensal de manutenção da loja, em reais.
 * Zera quando há CAPEX FREEZER implementado (economia modelada no serviço financeiro).
 */
export const MAINTENANCE_COST = 400;

/**
 * Dias extras de parada (SLA) somados ao downtime fixo do CAPEX, conforme quantos
 * operadores de serviço a loja tem. Mais pessoas no atendimento reduz o impacto.
 * Chave = quantidade de operadores de serviço (0 a 5); valor = dias adicionais na tabela.
 */
export const SLA_TABLE: Record<number, number> = { 0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };

// ─── Eventos Aleatórios ───────────────────────────────────────────────────────

/** Multa fixa por mudança regulatória (fiscalização). */
export const RANDOM_EVENT_FINE_REGULATORY = 30_000;
/** Multa fixa por ataque cibernético. */
export const RANDOM_EVENT_FINE_CYBER_ATTACK = 30_000;
/** Multa por vazamento de dados de clientes (LGPD). */
export const RANDOM_EVENT_FINE_DATA_BREACH = 25_000;

/** Queda de CSAT por repercussão negativa. */
export const RANDOM_EVENT_CSAT_PENALTY_REPUTATION = 0.15;
/** Queda de CSAT por vazamento de dados. */
export const RANDOM_EVENT_CSAT_PENALTY_DATA_BREACH = 0.10;

/** Fator de redução de demanda por promoção agressiva da concorrência. */
export const RANDOM_EVENT_DEMAND_PENALTY_COMPETITOR = 0.15;

/** Fração do estoque de Perecíveis destruído por contaminação de lote. */
export const RANDOM_EVENT_INVENTORY_LOSS_CONTAMINATION = 0.25;
/** Fração do estoque (todas as categorias) perdida por furto. */
export const RANDOM_EVENT_INVENTORY_LOSS_THEFT = 0.10;
/** Fração do pedido não entregue por problema logístico. */
export const RANDOM_EVENT_STOCK_REDUCTION_LOGISTICS = 0.20;

/** Fração do estoque de Perecíveis destruído por evento climático. */
export const RANDOM_EVENT_CLIMATE_INVENTORY_LOSS = 0.20;
/** Fator de redução de demanda por evento climático. */
export const RANDOM_EVENT_CLIMATE_DEMAND_REDUCTION = 0.10;

/** Percentual de aumento no custo de insumos (CMV de todas as categorias). */
export const RANDOM_EVENT_COST_INCREASE_PERCENT = 0.15;

/** Percentual de bônus de demanda por aumento inesperado de procura. */
export const RANDOM_EVENT_DEMAND_SURGE_PERCENT = 0.25;

/** Dias de parada por falha operacional. */
export const RANDOM_EVENT_DAYS_OPERATIONAL_FAILURE = 1;
/** Dias de parada por queda de energia. */
export const RANDOM_EVENT_DAYS_POWER_OUTAGE = 2;
/** Dias de parada por falha no sistema de pagamentos. */
export const RANDOM_EVENT_DAYS_PAYMENT_FAILURE = 1;
/** Dias de parada por ataque cibernético. */
export const RANDOM_EVENT_DAYS_CYBER_ATTACK = 2;

/** Probabilidade base de evento climático (afeta todas as lojas da sessão). */
export const RANDOM_EVENT_RISK_CLIMATE = 0.12;
/** Probabilidade base de aumento no custo de insumos (afeta todas as lojas). */
export const RANDOM_EVENT_RISK_COST_INCREASE = 0.18;
/** Probabilidade base de aumento inesperado de demanda (por loja). */
export const RANDOM_EVENT_RISK_DEMAND_SURGE = 0.20;
