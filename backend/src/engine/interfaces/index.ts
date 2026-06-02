/**
 * Dados de uma categoria de produto já preparados para o motor (decisões do PO + regras da categoria).
 * O serviço principal monta isso a partir do plano operacional e da configuração da sessão.
 */
export interface CategoryEngineInput {
  /** Identificador da categoria no banco. */
  categoryId: string;
  /** Nome exibível (ex.: Perecíveis). */
  categoryName: string;
  /** Custo unitário de compra, em reais. */
  unitCost: number;
  /**
   * Alíquota de imposto sobre a receita bruta desta categoria (decimal, ex.: 0,12 = 12%).
   * Multiplicamos pela receita porque o jogo trata imposto como percentual sobre o que foi vendido.
   */
  taxRate: number;
  /** Taxa de quebra (perda física) aplicada sobre estoque não vendido, na rodada 3. */
  breakageRate: number;
  /** Taxa de envelhecimento (perda por obsolescência/perecimento) sobre não vendido, na rodada 3. */
  agingRate: number;
  /** Estoque disponível na sessão para esta categoria (teto de quanto o mercado “enxerga”). */
  sessionStockAvailable: number;
  /** Quantidade que a loja comprou nesta rodada para esta categoria. */
  stockPurchased: number;
  /**
   * Margem sobre o custo (ex.: 0,2 = preço de venda = custo × 1,2).
   * Usamos na cesta média e na receita bruta simulada.
   */
  priceMargin: number;
}

/**
 * Um investimento (CAPEX) escolhido no plano, com os campos necessários para licenças, SLA e custos.
 */
export interface CapexEngineInput {
  /** Identificador da opção de CAPEX. */
  capexOptionId: string;
  /** Tipo lógico (FREEZER, SITE, etc.) usado em regras condicionais. */
  type: string;
  /** Custo de aquisição único, em reais, quando implementado. */
  acquisitionCost: number;
  /** Dias fixos de parada da loja se o risco de SLA se materializar (CAPEX não implementado). */
  downtimeFixedDays: number;
  /** Acréscimo mensal nas licenças de software quando este CAPEX está implementado. */
  monthlyLicenseDelta: number;
  /** Economia de manutenção declarada na opção (o motor usa FREEZER de outra forma). */
  maintenanceSaving: number;
  /**
   * Probabilidade (0 a 1) de ocorrer problema de SLA se o CAPEX não for implementado.
   * Comparada a um sorteio determinístico para manter o mesmo resultado para a mesma semente.
   */
  slaRiskPercent: number;
  /** Se a loja efetivamente comprou/instalou este CAPEX nesta versão do plano. */
  implemented: boolean;
}

/**
 * Indicadores resumidos de uma loja usados na disputa por demanda (preço, prateleira, satisfação).
 */
export interface StoreIndicators {
  /** Identificador da loja. */
  storeId: string;
  /**
   * Satisfação do cliente (0 a 1), combinando operadores de caixa e desempenho no quiz.
   */
  csat: number;
  /**
   * Razão entre o que a loja comprou e o estoque disponível na sessão (proxy de “prateleira cheia”).
   */
  availability: number;
  /** Preço médio ponderado da cesta, em reais (influencia a preferência por preço). */
  basketPrice: number;
}

/**
 * Resultado da etapa de demanda: posição da loja nos rankings e fatia de demanda final.
 */
export interface DemandResult {
  /** Identificador da loja. */
  storeId: string;
  /** Posição no ranking de preço (quanto maior o número, melhor para “preço” no modelo). */
  priceRank: number;
  /** Posição no ranking de disponibilidade. */
  availabilityRank: number;
  /** Posição no ranking de CSAT. */
  csatRank: number;
  /**
   * Soma dos três ranks; valores maiores indicam melhor posição relativa nos três eixos ao mesmo tempo.
   */
  rankScore: number;
  /**
   * Parte da demanda total (0 a 1) que esta loja absorve nesta rodada.
   * Calculada como rankScore dividido pela soma de todos os rankScores — quem tem rankScore maior leva fatia maior.
   */
  demandShare: number;
}

/** Entrada do cálculo de quebra e envelhecimento para uma categoria (rodada 3). */
export interface ShrinkageCategoryInput {
  /** Identificador da categoria. */
  categoryId: string;
  /** Custo unitário usado para valorar o não vendido. */
  unitCost: number;
  /** Taxa decimal de quebra sobre o não vendido. */
  breakageRate: number;
  /** Taxa decimal de envelhecimento sobre o não vendido. */
  agingRate: number;
  /** Total acumulado de unidades não vendidas ao longo das rodadas consideradas. */
  totalUnsold: number;
}

/** Valores monetários de perda por categoria após aplicar as taxas sobre o não vendido. */
export interface ShrinkageCategoryResult {
  /** Identificador da categoria. */
  categoryId: string;
  /** Valor em reais perdido por quebra (produto estragado/danificado). */
  breakageAmount: number;
  /** Valor em reais perdido por envelhecimento (obsolescência, etc.). */
  agingAmount: number;
}

/** Consolidação de todas as categorias para o EBITDA (totais e detalhe por categoria). */
export interface ShrinkageResult {
  /** Detalhamento por categoria. */
  categories: ShrinkageCategoryResult[];
  /** Soma em reais das perdas por quebra. */
  totalBreakage: number;
  /** Soma em reais das perdas por envelhecimento. */
  totalAging: number;
}

/**
 * Resultado financeiro por categoria após aplicar a fatia de demanda e impostos sobre a venda.
 */
export interface CategoryRevenueResult {
  /** Identificador da categoria. */
  categoryId: string;
  /** Unidades efetivamente vendidas (limitadas pelo estoque comprado e pela demanda). */
  stockSold: number;
  /** Unidades compradas que não viraram venda nesta rodada. */
  unsoldStock: number;
  /** Receita bruta antes de imposto (unidades vendidas × preço de venda). */
  grossRevenue: number;
  /** Imposto incidente sobre a receita bruta desta categoria. */
  taxAmount: number;
  /** Custo do que foi vendido (CMV), em reais. */
  costOfGoods: number;
}

/** Tudo que o FinancialService precisa para montar o EBITDA da rodada. */
export interface EbitdaInput {
  /** Receitas e CMV por categoria já calculados. */
  categoryRevenues: CategoryRevenueResult[];
  /** Quantidade de operadores de caixa (folha). */
  cashierOperators: number;
  /** Quantidade de operadores de atendimento (folha e SLA). */
  serviceOperators: number;
  /** Salário por operador de caixa configurado na sessão. */
  cashierSalary: number;
  /** Salário por operador de serviço configurado na sessão. */
  serviceSalary: number;
  /** Licença base de software configurada na sessão. */
  baseLicenseCost: number;
  /** Custo mensal de manutenção configurado na sessão. */
  maintenanceCost: number;
  /** Taxa de juros configurada na sessão, em decimal. */
  interestRate: number;
  /** Decisões de CAPEX da versão de plano vigente. */
  capexDecisions: CapexEngineInput[];
  /** Caixa usado na rodada (compra de estoque + CAPEX), base para juros. */
  cashUsed: number;
  /**
   * Limite de caixa “isento” de juros nesta rodada (evolui após a rodada 1 conforme regras do jogo).
   */
  interestThreshold: number;
  /** Receita perdida por paradas de SLA (já agregada dos eventos). */
  slaRevenueLost: number;
  /** Totais de quebra/envelhecimento (rodada 3 ou vazio). */
  shrinkage: ShrinkageResult;
}

/** Decomposição do EBITDA e percentual sobre receita bruta, para persistência e relatórios. */
export interface EbitdaBreakdown {
  /** Mesmo detalhamento por categoria enviado na entrada. */
  categoryRevenues: CategoryRevenueResult[];
  /** Soma da receita bruta de todas as categorias. */
  grossRevenue: number;
  /** Impostos totais sobre a receita bruta. */
  taxAmount: number;
  /** Receita após impostos (bruta − imposto). */
  netRevenue: number;
  /** Custo da mercadoria vendida (CMV) total. */
  costOfGoods: number;
  /** Perdas por quebra (shrinkage). */
  breakageAmount: number;
  /** Perdas por envelhecimento (shrinkage). */
  agingAmount: number;
  /** Salários de caixa e serviço. */
  payrollCost: number;
  /** Manutenção fixa ou zero se houver FREEZER. */
  maintenanceCost: number;
  /** Licenças de software (base + deltas de CAPEX). */
  licenseCost: number;
  /** Juros sobre caixa usado acima do limite. */
  interestCost: number;
  /** Receita perdida por incidentes de SLA. */
  slaRevenueLost: number;
  /** Lucro operacional simulado após todas as linhas acima. */
  ebitda: number;
  /** EBITDA dividido pela receita bruta; 0 se não houve receita (evita divisão por zero). */
  ebitdaPercentage: number;
}

/** Dados de entrada para simular eventos de SLA por CAPEX não implementado. */
export interface SlaInput {
  /** Sessão (entra na semente do sorteio). */
  sessionId: string;
  /** Loja (entra na semente do sorteio). */
  storeId: string;
  /** Rodada atual. */
  round: number;
  /** Usado na tabela de dias extras de parada. */
  serviceOperators: number;
  /** Cada CAPEX não implementado pode gerar evento. */
  capexDecisions: CapexEngineInput[];
  /** Receita bruta antes do SLA, usada para estimar perda diária proporcional ao mês. */
  grossRevenue: number;
}

/** Um evento de SLA ligado a uma opção de CAPEX (ocorreu ou não, dias parados, dinheiro perdido). */
export interface SlaEventResult {
  /** Opção de CAPEX associada ao risco. */
  capexOptionId: string;
  /** Tipo do CAPEX (para exibição e semente). */
  capexType: string;
  /** Se o incidente de SLA ocorreu nesta rodada. */
  occurred: boolean;
  /** Dias de loja parada (fixo + tabela de serviço). */
  daysDown: number;
  /** Estimativa de receita perdida nesses dias. */
  revenueLost: number;
}

/** Lista de eventos de SLA e soma da receita perdida na rodada. */
export interface SlaResult {
  /** Um item por opção de CAPEX analisada. */
  events: SlaEventResult[];
  /** Soma das receitas perdidas de todos os eventos. */
  totalRevenueLost: number;
}
