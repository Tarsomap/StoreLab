/**
 * Demo Seed — retail-game-platform
 * Popula o banco com 4 sessões em estados diferentes e 25 usuários com credenciais conhecidas.
 * Uso: npm run seed:demo
 * Reset: npm run seed:demo:reset
 */

import {
  PrismaClient,
  CategoryName,
  CapexType,
  StoreRole,
  UserRole,
  SessionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ── Inline engine constants ───────────────────────────────────────────────────

const IDEAL_CASHIER_OPERATORS = 10;
const BASE_LICENSE_COST = 1200;
const CASHIER_SALARY = 1_000;
const SERVICE_SALARY = 1_200;
const MAINTENANCE_COST = 400;
const INTEREST_RATE_MONTHLY = 0.12;
const SLA_TABLE: Record<number, number> = { 0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
const INITIAL_CASH = 700_000;

// ── Inline engine types ───────────────────────────────────────────────────────

interface CategoryInput {
  categoryId: string;
  categoryName: CategoryName;
  unitCost: number;
  taxRate: number;
  breakageRate: number;
  agingRate: number;
  sessionStockAvailable: number;
  stockPurchased: number;
  priceMargin: number;
}

interface CapexInput {
  capexOptionId: string;
  type: CapexType;
  acquisitionCost: number;
  downtimeFixedDays: number;
  monthlyLicenseDelta: number;
  slaRiskPercent: number;
  implemented: boolean;
}

interface CategoryRevenue {
  categoryId: string;
  stockSold: number;
  unsoldStock: number;
  grossRevenue: number;
  taxAmount: number;
  costOfGoods: number;
}

interface SlaEventResult {
  capexOptionId: string;
  capexType: CapexType;
  occurred: boolean;
  daysDown: number;
  revenueLost: number;
}

// ── Inline engine functions ───────────────────────────────────────────────────

function computeCsat(cashierOps: number, quizScorePercent: number): number {
  return Math.min(1, Math.max(0, (cashierOps / IDEAL_CASHIER_OPERATORS) * quizScorePercent));
}

function computeAvailability(categories: CategoryInput[]): number {
  const totalPurchased = categories.reduce((s, c) => s + c.stockPurchased, 0);
  const totalAvailable = categories.reduce((s, c) => s + c.sessionStockAvailable, 0);
  return totalAvailable === 0 ? 0 : totalPurchased / totalAvailable;
}

function computeBasketPrice(categories: CategoryInput[]): number {
  const totalPurchased = categories.reduce((s, c) => s + c.stockPurchased, 0);
  if (totalPurchased === 0) return 0;
  const weightedSum = categories.reduce(
    (s, c) => s + c.stockPurchased * c.unitCost * (1 + c.priceMargin),
    0,
  );
  return weightedSum / totalPurchased;
}

function rankIndicator(
  stores: { storeId: string; value: number }[],
  lowerIsBetter: boolean,
): Map<string, number> {
  const n = stores.length;
  const sorted = [...stores].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
  const rankMap = new Map<string, number>();
  let currentRank = n;
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].value === sorted[i].value) j++;
    const tiedRank = currentRank - (j - i) + 1;
    for (let k = i; k < j; k++) rankMap.set(sorted[k].storeId, tiedRank);
    currentRank -= j - i;
    i = j;
  }
  return rankMap;
}

function computeDemand(indicators: { storeId: string; csat: number; availability: number; basketPrice: number }[]) {
  const priceRanks = rankIndicator(indicators.map(s => ({ storeId: s.storeId, value: s.basketPrice })), true);
  const availRanks = rankIndicator(indicators.map(s => ({ storeId: s.storeId, value: s.availability })), false);
  const csatRanks = rankIndicator(indicators.map(s => ({ storeId: s.storeId, value: s.csat })), false);

  const results = indicators.map(s => {
    const rankScore = (priceRanks.get(s.storeId) ?? 1) + (availRanks.get(s.storeId) ?? 1) + (csatRanks.get(s.storeId) ?? 1);
    return { storeId: s.storeId, rankScore, priceRank: priceRanks.get(s.storeId) ?? 1, availabilityRank: availRanks.get(s.storeId) ?? 1, csatRank: csatRanks.get(s.storeId) ?? 1, demandShare: 0 };
  });
  const totalScore = results.reduce((s, r) => s + r.rankScore, 0);
  results.forEach(r => { r.demandShare = totalScore > 0 ? r.rankScore / totalScore : 0; });
  return results;
}

function computeCategoryRevenues(categories: CategoryInput[], demandShare: number): CategoryRevenue[] {
  return categories.map(cat => {
    const maxSellable = cat.sessionStockAvailable * demandShare;
    const stockSold = Math.min(cat.stockPurchased, maxSellable);
    const unsoldStock = cat.stockPurchased - stockSold;
    const salePrice = cat.unitCost * (1 + cat.priceMargin);
    const grossRevenue = stockSold * salePrice;
    const taxAmount = grossRevenue * cat.taxRate;
    const costOfGoods = stockSold * cat.unitCost;
    return { categoryId: cat.categoryId, stockSold, unsoldStock, grossRevenue, taxAmount, costOfGoods };
  });
}

function computeSlaEvents(
  sessionId: string, storeId: string, round: number,
  serviceOps: number, capexDecisions: CapexInput[], grossRevenue: number,
): SlaEventResult[] {
  const slaAddition = SLA_TABLE[serviceOps] ?? SLA_TABLE[5];
  return capexDecisions.map(capex => {
    if (capex.implemented) return { capexOptionId: capex.capexOptionId, capexType: capex.type, occurred: false, daysDown: 0, revenueLost: 0 };
    const seed = `${sessionId}-${storeId}-${round}-${capex.type}`;
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    const r = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
    const occurred = r < capex.slaRiskPercent;
    const daysDown = occurred ? capex.downtimeFixedDays + slaAddition : 0;
    const revenueLost = occurred ? (grossRevenue / 30) * daysDown : 0;
    return { capexOptionId: capex.capexOptionId, capexType: capex.type, occurred, daysDown, revenueLost };
  });
}

function computeEbitda(
  categoryRevenues: CategoryRevenue[], cashierOps: number, serviceOps: number,
  capexDecisions: CapexInput[], cashUsed: number, interestThreshold: number,
  slaRevenueLost: number, breakageAmount: number, agingAmount: number,
) {
  const grossRevenue = categoryRevenues.reduce((s, c) => s + c.grossRevenue, 0);
  const taxAmount = categoryRevenues.reduce((s, c) => s + c.taxAmount, 0);
  const netRevenue = grossRevenue - taxAmount;
  const costOfGoods = categoryRevenues.reduce((s, c) => s + c.costOfGoods, 0);
  const payrollCost = cashierOps * CASHIER_SALARY + serviceOps * SERVICE_SALARY;
  const hasFreezer = capexDecisions.some(c => c.type === CapexType.FREEZER && c.implemented);
  const maintenanceCost = hasFreezer ? 0 : MAINTENANCE_COST;
  const licenseCost = BASE_LICENSE_COST + capexDecisions.filter(c => c.implemented).reduce((s, c) => {
    const capexData = CAPEX_DATA.find(d => d.type === c.type);
    return s + (capexData?.monthlyLicenseDelta ?? 0);
  }, 0);
  const interestCost = Math.max(0, cashUsed - interestThreshold) * INTEREST_RATE_MONTHLY;
  const ebitda = netRevenue - costOfGoods - breakageAmount - agingAmount - payrollCost - maintenanceCost - licenseCost - interestCost - slaRevenueLost;
  const ebitdaPercentage = grossRevenue > 0 ? ebitda / grossRevenue : 0;
  return { grossRevenue, taxAmount, netRevenue, costOfGoods, breakageAmount, agingAmount, payrollCost, maintenanceCost, licenseCost, interestCost, slaRevenueLost, ebitda, ebitdaPercentage };
}

// ── Static reference data (mirrors seed.ts) ───────────────────────────────────

const CATEGORY_DATA = [
  { name: CategoryName.PERECIVEIS, unitCost: 20, taxRate: 0.12, breakageRate: 0.020, agingRate: 0.058, stockAvailable: 4000 },
  { name: CategoryName.MERCEARIA,  unitCost: 30, taxRate: 0.07, breakageRate: 0.015, agingRate: 0.008, stockAvailable: 6000 },
  { name: CategoryName.ELETRO,     unitCost: 500, taxRate: 0.25, breakageRate: 0.000, agingRate: 0.013, stockAvailable: 700 },
  { name: CategoryName.HIPEL,      unitCost: 45, taxRate: 0.17, breakageRate: 0.010, agingRate: 0.011, stockAvailable: 5000 },
];

const CAPEX_DATA = [
  { type: CapexType.SECURITY,      acquisitionCost: 50_000, downtimeFixedDays: 2, monthlyLicenseDelta: 100, slaRiskPercent: 0.15 },
  { type: CapexType.FREEZER,       acquisitionCost: 75_000, downtimeFixedDays: 1, monthlyLicenseDelta: 0,   slaRiskPercent: 0.10 },
  { type: CapexType.NETWORK,       acquisitionCost: 80_000, downtimeFixedDays: 2, monthlyLicenseDelta: 0,   slaRiskPercent: 0.05 },
  { type: CapexType.SITE,          acquisitionCost: 65_000, downtimeFixedDays: 1, monthlyLicenseDelta: 150, slaRiskPercent: 0.10 },
  { type: CapexType.SELF_CHECKOUT, acquisitionCost: 80_000, downtimeFixedDays: 2, monthlyLicenseDelta: 320, slaRiskPercent: 0.20 },
  { type: CapexType.AUTOMATION,    acquisitionCost: 45_000, downtimeFixedDays: 0, monthlyLicenseDelta: 0,   slaRiskPercent: 0.00 },
];

// ── Quiz questions (10 por rodada, PT-BR) ─────────────────────────────────────

type QuizQDef = { prompt: string; options: { label: string; isCorrect: boolean }[] };

const QUIZ_ROUNDS: Record<1 | 2 | 3, QuizQDef[]> = {
  1: [
    { prompt: 'O que significa a sigla EBITDA?', options: [{ label: 'Lucro antes de juros, impostos, depreciação e amortização', isCorrect: true }, { label: 'Lucro líquido após todos os impostos', isCorrect: false }, { label: 'Receita bruta total da loja', isCorrect: false }, { label: 'Resultado operacional com depreciação incluída', isCorrect: false }] },
    { prompt: 'Qual é a principal função do Gerente de Abastecimento?', options: [{ label: 'Definir a estratégia de preços', isCorrect: false }, { label: 'Gerenciar o estoque e as decisões de compra por categoria', isCorrect: true }, { label: 'Controlar a folha de pagamento dos operadores', isCorrect: false }, { label: 'Definir o número de caixas em operação', isCorrect: false }] },
    { prompt: 'O que é margem bruta de um produto?', options: [{ label: 'Receita total menos todos os custos fixos', isCorrect: false }, { label: 'Lucro antes do pagamento de impostos', isCorrect: false }, { label: 'Receita de venda menos o custo de aquisição', isCorrect: true }, { label: 'Valor do desconto concedido ao cliente', isCorrect: false }] },
    { prompt: 'Qual categoria possui a maior alíquota de imposto na simulação?', options: [{ label: 'Mercearia (7%)', isCorrect: false }, { label: 'Perecíveis (12%)', isCorrect: false }, { label: 'HIPEL (17%)', isCorrect: false }, { label: 'Eletro (25%)', isCorrect: true }] },
    { prompt: 'O que representa o CSAT no jogo?', options: [{ label: 'Índice de satisfação que mede o atendimento ao cliente', isCorrect: true }, { label: 'Custo de aquisição de estoque total', isCorrect: false }, { label: 'Taxa de conversão de vendas', isCorrect: false }, { label: 'Índice de quebra de produtos perecíveis', isCorrect: false }] },
    { prompt: 'Qual CAPEX elimina o custo de manutenção de R$400/mês?', options: [{ label: 'Segurança', isCorrect: false }, { label: 'Self Checkout', isCorrect: false }, { label: 'Balança/Freezer', isCorrect: true }, { label: 'Melhoria Contínua', isCorrect: false }] },
    { prompt: 'Como é calculada a demanda de cada loja no jogo?', options: [{ label: 'Proporcionalmente ao preço médio, disponibilidade e CSAT', isCorrect: true }, { label: 'Pelo número de operadores de caixa', isCorrect: false }, { label: 'Exclusivamente pelo volume de estoque adquirido', isCorrect: false }, { label: 'Pelo investimento em CAPEX realizado', isCorrect: false }] },
    { prompt: 'Juros incidem quando o caixa utilizado supera qual valor?', options: [{ label: 'R$ 500.000', isCorrect: false }, { label: 'R$ 700.000', isCorrect: true }, { label: 'R$ 1.000.000', isCorrect: false }, { label: 'R$ 350.000', isCorrect: false }] },
    { prompt: 'Em qual rodada ocorre o cálculo de quebras e aging de estoque?', options: [{ label: 'Rodada 1', isCorrect: false }, { label: 'Rodada 2', isCorrect: false }, { label: 'Rodada 3', isCorrect: true }, { label: 'Em todas as rodadas', isCorrect: false }] },
    { prompt: 'O que aumenta o risco de incidente de SLA de uma loja?', options: [{ label: 'Alto número de operadores de caixa', isCorrect: false }, { label: 'Não implementar os CAPEXs disponíveis', isCorrect: true }, { label: 'Margem comercial elevada', isCorrect: false }, { label: 'Grande volume de estoque adquirido', isCorrect: false }] },
  ],
  2: [
    { prompt: 'Qual é o papel do Gerente Comercial no PO?', options: [{ label: 'Definir a margem de preço por categoria', isCorrect: true }, { label: 'Aprovar os investimentos de CAPEX', isCorrect: false }, { label: 'Controlar os operadores de serviço', isCorrect: false }, { label: 'Calcular os impostos devidos', isCorrect: false }] },
    { prompt: 'O que representa o "Share de Demanda" no jogo?', options: [{ label: 'A fatia do estoque disponível que a loja pode vender', isCorrect: true }, { label: 'O percentual de clientes satisfeitos', isCorrect: false }, { label: 'A receita bruta dividida pelo número de lojas', isCorrect: false }, { label: 'A quantidade de SKUs por categoria', isCorrect: false }] },
    { prompt: 'Quando o CAPEX de Redes reduz o risco de SLA?', options: [{ label: 'Nunca — Redes não afeta SLA', isCorrect: false }, { label: 'Quando implementado, o risco de incidente de rede é eliminado', isCorrect: true }, { label: 'Apenas na rodada 3', isCorrect: false }, { label: 'Somente em combinação com o CAPEX de Segurança', isCorrect: false }] },
    { prompt: 'Qual indicador penaliza mais uma loja com preço alto no ranking?', options: [{ label: 'CSAT baixo', isCorrect: false }, { label: 'Baixa disponibilidade de estoque', isCorrect: false }, { label: 'Preço médio da cesta (basket price)', isCorrect: true }, { label: 'Alto custo de manutenção', isCorrect: false }] },
    { prompt: 'O que acontece com o estoque não vendido ao fim de cada rodada?', options: [{ label: 'É reembolsado ao caixa da loja', isCorrect: false }, { label: 'Permanece como ativo sem custo até a rodada 3', isCorrect: true }, { label: 'Gera custo de quebra imediato', isCorrect: false }, { label: 'É redistribuído entre as lojas', isCorrect: false }] },
    { prompt: 'A Reconfiguração entre as rodadas 1 e 2 permite:', options: [{ label: 'Trocar o facilitador da sessão', isCorrect: false }, { label: 'Transferir jogadores entre lojas e atualizar o PO para as rodadas 2 e 3', isCorrect: true }, { label: 'Desfazer os resultados da rodada 1', isCorrect: false }, { label: 'Adicionar novas categorias de produto', isCorrect: false }] },
    { prompt: 'Qual é o salário mensal de um operador de serviços?', options: [{ label: 'R$ 800', isCorrect: false }, { label: 'R$ 1.000', isCorrect: false }, { label: 'R$ 1.200', isCorrect: true }, { label: 'R$ 1.500', isCorrect: false }] },
    { prompt: 'No cálculo do CSAT, qual variável do PO mais influencia o resultado?', options: [{ label: 'Número de operadores de caixa e score do quiz', isCorrect: true }, { label: 'Volume de estoque adquirido', isCorrect: false }, { label: 'Margem comercial média', isCorrect: false }, { label: 'Número de CAPEXs implementados', isCorrect: false }] },
    { prompt: 'O Self Checkout agrega qual custo de licença mensal?', options: [{ label: 'R$ 100', isCorrect: false }, { label: 'R$ 150', isCorrect: false }, { label: 'R$ 320', isCorrect: true }, { label: 'R$ 250', isCorrect: false }] },
    { prompt: 'Qual categoria tem a maior taxa de breaking/aging?', options: [{ label: 'Mercearia', isCorrect: false }, { label: 'Perecíveis', isCorrect: true }, { label: 'Eletro', isCorrect: false }, { label: 'HIPEL', isCorrect: false }] },
  ],
  3: [
    { prompt: 'O aging de estoque afeta qual categoria com taxa de 1,3%?', options: [{ label: 'Mercearia', isCorrect: false }, { label: 'Perecíveis', isCorrect: false }, { label: 'HIPEL', isCorrect: false }, { label: 'Eletro', isCorrect: true }] },
    { prompt: 'O que determina o vencedor do jogo?', options: [{ label: 'Maior receita bruta acumulada', isCorrect: false }, { label: 'Maior %EBITDA acumulado nas 3 rodadas', isCorrect: true }, { label: 'Maior estoque vendido ao longo do jogo', isCorrect: false }, { label: 'Menor custo de CAPEX total investido', isCorrect: false }] },
    { prompt: 'Uma loja com alta disponibilidade de estoque tende a receber:', options: [{ label: 'Rank de disponibilidade mais alto, favorecendo o demandShare', isCorrect: true }, { label: 'Penalidade por excesso de estoque', isCorrect: false }, { label: 'Menor alíquota de imposto', isCorrect: false }, { label: 'Custo de juros reduzido', isCorrect: false }] },
    { prompt: 'Qual CAPEX não gera risco de incidente de SLA?', options: [{ label: 'Segurança', isCorrect: false }, { label: 'Self Checkout', isCorrect: false }, { label: 'Melhoria Contínua', isCorrect: true }, { label: 'Redes', isCorrect: false }] },
    { prompt: 'O que a transferência obrigatória de jogadores simula no varejo real?', options: [{ label: 'Demissão de colaboradores', isCorrect: false }, { label: 'Rotatividade e redistribuição de talentos entre unidades', isCorrect: true }, { label: 'Fusão de duas lojas', isCorrect: false }, { label: 'Promoção de cargos dentro da mesma loja', isCorrect: false }] },
    { prompt: 'A base de licença de software (R$1.200) já inclui:', options: [{ label: 'OS + PDV + Site + Segurança', isCorrect: true }, { label: 'Apenas o sistema operacional de R$120', isCorrect: false }, { label: 'Todos os CAPEXs de tecnologia', isCorrect: false }, { label: 'O Self Checkout e o PDV', isCorrect: false }] },
    { prompt: 'Um operador de caixa a mais sempre aumenta o CSAT?', options: [{ label: 'Sim, sem limite', isCorrect: false }, { label: 'Não, pois o CSAT é limitado a 1,0 (100%)', isCorrect: true }, { label: 'Apenas se houver 5 ou mais operadores', isCorrect: false }, { label: 'Não, operadores de caixa não afetam o CSAT', isCorrect: false }] },
    { prompt: 'Qual é a taxa de juros mensal aplicada quando o caixa é ultrapassado?', options: [{ label: '8%', isCorrect: false }, { label: '10%', isCorrect: false }, { label: '12%', isCorrect: true }, { label: '15%', isCorrect: false }] },
    { prompt: 'Na rodada 3, os custos de quebra e aging incidem sobre:', options: [{ label: 'Apenas o estoque não vendido na rodada 3', isCorrect: false }, { label: 'O estoque acumulado não vendido nas rodadas 1, 2 e 3', isCorrect: true }, { label: 'Todo o estoque comprado no jogo', isCorrect: false }, { label: 'Apenas os produtos perecíveis', isCorrect: false }] },
    { prompt: 'Qual estratégia tende a maximizar o demandShare de uma loja?', options: [{ label: 'Margem alta + baixo estoque + muitos operadores de caixa', isCorrect: false }, { label: 'Preço competitivo + alta disponibilidade + alto CSAT', isCorrect: true }, { label: 'Focar apenas em CAPEX de automação', isCorrect: false }, { label: 'Investir somente em Eletro por ter maior margem potencial', isCorrect: false }] },
  ],
};

// ── Store strategy configs ────────────────────────────────────────────────────

interface StoreStrategy {
  storeName: string;
  accessCode: string;
  v1: PlanConfig;
  v2: PlanConfig;
  quizScores: Record<1 | 2 | 3, number>; // 0–100
}

interface PlanConfig {
  cashierOps: number;
  serviceOps: number;
  implementedCapex: CapexType[];
  stock: Record<CategoryName, number>;
  margins: Record<CategoryName, number>;
}

// Stock totals per session MUST equal category limits: PERECIVEIS=4000, MERCEARIA=6000, ELETRO=700, HIPEL=5000
const STORE_STRATEGIES: StoreStrategy[] = [
  {
    storeName: 'Loja Alpha',
    accessCode: 'ALP001',
    v1: {
      cashierOps: 8, serviceOps: 3,
      implementedCapex: [CapexType.FREEZER, CapexType.SECURITY],
      stock: { PERECIVEIS: 600, MERCEARIA: 1500, ELETRO: 200, HIPEL: 1500 },
      margins: { PERECIVEIS: 0.30, MERCEARIA: 0.20, ELETRO: 0.35, HIPEL: 0.25 },
    },
    v2: {
      cashierOps: 9, serviceOps: 3,
      implementedCapex: [CapexType.FREEZER, CapexType.SECURITY, CapexType.NETWORK],
      stock: { PERECIVEIS: 700, MERCEARIA: 1600, ELETRO: 180, HIPEL: 1400 },
      margins: { PERECIVEIS: 0.28, MERCEARIA: 0.22, ELETRO: 0.30, HIPEL: 0.25 },
    },
    quizScores: { 1: 80, 2: 85, 3: 80 },
  },
  {
    storeName: 'Loja Beta',
    accessCode: 'BET002',
    v1: {
      cashierOps: 10, serviceOps: 2,
      implementedCapex: [CapexType.SELF_CHECKOUT, CapexType.SITE, CapexType.SECURITY],
      stock: { PERECIVEIS: 2000, MERCEARIA: 3000, ELETRO: 300, HIPEL: 2500 },
      margins: { PERECIVEIS: 0.15, MERCEARIA: 0.10, ELETRO: 0.25, HIPEL: 0.20 },
    },
    v2: {
      cashierOps: 10, serviceOps: 2,
      implementedCapex: [CapexType.SELF_CHECKOUT, CapexType.SITE, CapexType.SECURITY],
      stock: { PERECIVEIS: 1800, MERCEARIA: 2800, ELETRO: 350, HIPEL: 2700 },
      margins: { PERECIVEIS: 0.12, MERCEARIA: 0.10, ELETRO: 0.22, HIPEL: 0.18 },
    },
    quizScores: { 1: 70, 2: 75, 3: 65 },
  },
  {
    storeName: 'Loja Sigma',
    accessCode: 'SIG003',
    v1: {
      cashierOps: 6, serviceOps: 5,
      implementedCapex: [],
      stock: { PERECIVEIS: 200, MERCEARIA: 500, ELETRO: 50, HIPEL: 300 },
      margins: { PERECIVEIS: 0.40, MERCEARIA: 0.35, ELETRO: 0.50, HIPEL: 0.40 },
    },
    v2: {
      cashierOps: 7, serviceOps: 4,
      implementedCapex: [CapexType.FREEZER],
      stock: { PERECIVEIS: 250, MERCEARIA: 600, ELETRO: 60, HIPEL: 400 },
      margins: { PERECIVEIS: 0.38, MERCEARIA: 0.32, ELETRO: 0.45, HIPEL: 0.38 },
    },
    quizScores: { 1: 90, 2: 95, 3: 90 },
  },
  {
    storeName: 'Loja Gamma',
    accessCode: 'GAM004',
    v1: {
      cashierOps: 4, serviceOps: 1,
      implementedCapex: [CapexType.AUTOMATION, CapexType.NETWORK],
      stock: { PERECIVEIS: 1200, MERCEARIA: 1000, ELETRO: 150, HIPEL: 700 },
      margins: { PERECIVEIS: 0.10, MERCEARIA: 0.08, ELETRO: 0.15, HIPEL: 0.12 },
    },
    v2: {
      cashierOps: 5, serviceOps: 2,
      implementedCapex: [CapexType.AUTOMATION, CapexType.NETWORK],
      stock: { PERECIVEIS: 1250, MERCEARIA: 1000, ELETRO: 110, HIPEL: 500 },
      margins: { PERECIVEIS: 0.12, MERCEARIA: 0.10, ELETRO: 0.18, HIPEL: 0.15 },
    },
    quizScores: { 1: 50, 2: 60, 3: 55 },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLES: StoreRole[] = [
  StoreRole.STORE_MANAGER,
  StoreRole.SUPPLY_MANAGER,
  StoreRole.COMMERCIAL_MANAGER,
  StoreRole.OPERATIONAL_MANAGER,
  StoreRole.SERVICE_MANAGER,
];

async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

function catName(c: CategoryName): CategoryName {
  return c;
}

// ── Round computation ─────────────────────────────────────────────────────────

interface StoreRoundState {
  storeId: string;
  strategyIndex: number;
  round1CashUsed?: number;
}

async function runAndPersistRound(
  sessionId: string,
  storeStates: StoreRoundState[],
  round: 1 | 2 | 3,
  categoryMap: Map<CategoryName, { id: string } & (typeof CATEGORY_DATA)[0]>,
  capexMap: Map<CapexType, { id: string } & (typeof CAPEX_DATA)[0]>,
) {
  const configVersion = round === 1 ? 1 : 2;

  const storeInputs = storeStates.map(({ storeId, strategyIndex }) => {
    const strat = STORE_STRATEGIES[strategyIndex];
    const planCfg = configVersion === 1 ? strat.v1 : strat.v2;
    const quizScore = strat.quizScores[round] / 100;

    const categories: CategoryInput[] = CATEGORY_DATA.map(catData => {
      const cat = categoryMap.get(catData.name)!;
      return {
        categoryId: cat.id,
        categoryName: catData.name,
        unitCost: catData.unitCost,
        taxRate: catData.taxRate,
        breakageRate: catData.breakageRate,
        agingRate: catData.agingRate,
        sessionStockAvailable: catData.stockAvailable,
        stockPurchased: planCfg.stock[catData.name],
        priceMargin: planCfg.margins[catData.name],
      };
    });

    const capexDecisions: CapexInput[] = CAPEX_DATA.map(capexData => {
      const cap = capexMap.get(capexData.type)!;
      return {
        capexOptionId: cap.id,
        type: capexData.type,
        acquisitionCost: capexData.acquisitionCost,
        downtimeFixedDays: capexData.downtimeFixedDays,
        monthlyLicenseDelta: capexData.monthlyLicenseDelta,
        slaRiskPercent: capexData.slaRiskPercent,
        implemented: planCfg.implementedCapex.includes(capexData.type),
      };
    });

    const stockCost = categories.reduce((s, c) => s + c.stockPurchased * c.unitCost, 0);
    const capexCost = capexDecisions.filter(c => c.implemented).reduce((s, c) => s + c.acquisitionCost, 0);
    const cashUsed = stockCost + capexCost;

    const csat = computeCsat(planCfg.cashierOps, quizScore);
    const availability = computeAvailability(categories);
    const basketPrice = computeBasketPrice(categories);

    return { storeId, strategyIndex, categories, capexDecisions, cashierOps: planCfg.cashierOps, serviceOps: planCfg.serviceOps, cashUsed, quizScore, csat, availability, basketPrice };
  });

  const demandResults = computeDemand(storeInputs.map(s => ({ storeId: s.storeId, csat: s.csat, availability: s.availability, basketPrice: s.basketPrice })));

  for (const si of storeInputs) {
    const demand = demandResults.find(d => d.storeId === si.storeId)!;
    const catRevenues = computeCategoryRevenues(si.categories, demand.demandShare);
    const grossRevBeforeSla = catRevenues.reduce((s, c) => s + c.grossRevenue, 0);

    const slaEvents = computeSlaEvents(sessionId, si.storeId, round, si.serviceOps, si.capexDecisions, grossRevBeforeSla);
    const slaRevenueLost = slaEvents.reduce((s, e) => s + e.revenueLost, 0);

    // Interest threshold
    let interestThreshold = INITIAL_CASH;
    if (round > 1) {
      const round1Result = await prisma.roundResult.findUnique({ where: { storeId_round: { storeId: si.storeId, round: 1 } } });
      if (round1Result) {
        const strat = STORE_STRATEGIES[si.strategyIndex];
        const unimplementedCost = CAPEX_DATA.filter(c => !strat.v1.implementedCapex.includes(c.type)).reduce((s, c) => s + c.acquisitionCost, 0);
        interestThreshold = INITIAL_CASH - round1Result.cashUsed + unimplementedCost;
      }
    }

    // Shrinkage (only round 3)
    let breakageAmount = 0;
    let agingAmount = 0;
    if (round === 3) {
      const unsoldByCategory = new Map<string, number>();
      // Current round unsold
      for (const cr of catRevenues) {
        unsoldByCategory.set(cr.categoryId, (unsoldByCategory.get(cr.categoryId) ?? 0) + cr.unsoldStock);
      }
      // Previous rounds (1 and 2) unsold estimation
      for (const prevRound of [1, 2] as const) {
        const prevResult = await prisma.roundResult.findUnique({ where: { storeId_round: { storeId: si.storeId, round: prevRound } } });
        if (!prevResult) continue;
        const prevConfigVersion = prevRound === 1 ? 1 : 2;
        const strat = STORE_STRATEGIES[si.strategyIndex];
        const prevPlanCfg = prevConfigVersion === 1 ? strat.v1 : strat.v2;
        for (const catData of CATEGORY_DATA) {
          const cat = categoryMap.get(catData.name)!;
          const purchased = prevPlanCfg.stock[catData.name];
          const estimatedSold = Math.min(purchased, purchased * prevResult.demandShare);
          const unsold = Math.max(0, purchased - estimatedSold);
          unsoldByCategory.set(cat.id, (unsoldByCategory.get(cat.id) ?? 0) + unsold);
        }
      }
      for (const catData of CATEGORY_DATA) {
        const cat = categoryMap.get(catData.name)!;
        const totalUnsold = Math.max(0, unsoldByCategory.get(cat.id) ?? 0);
        breakageAmount += totalUnsold * catData.unitCost * catData.breakageRate;
        agingAmount += totalUnsold * catData.unitCost * catData.agingRate;
      }
    }

    const ebitda = computeEbitda(catRevenues, si.cashierOps, si.serviceOps, si.capexDecisions, si.cashUsed, interestThreshold, slaRevenueLost, breakageAmount, agingAmount);

    await prisma.roundResult.upsert({
      where: { storeId_round: { storeId: si.storeId, round } },
      create: {
        storeId: si.storeId, sessionId, round,
        csat: si.csat, availability: si.availability, basketPrice: si.basketPrice,
        rankScore: demand.rankScore, demandShare: demand.demandShare,
        grossRevenue: ebitda.grossRevenue, taxAmount: ebitda.taxAmount,
        netRevenue: ebitda.netRevenue, costOfGoods: ebitda.costOfGoods,
        breakageAmount: ebitda.breakageAmount, agingAmount: ebitda.agingAmount,
        payrollCost: ebitda.payrollCost, maintenanceCost: ebitda.maintenanceCost,
        licenseCost: ebitda.licenseCost, interestCost: ebitda.interestCost,
        slaRevenueLost: ebitda.slaRevenueLost, ebitda: ebitda.ebitda,
        ebitdaPercentage: ebitda.ebitdaPercentage, cashUsed: si.cashUsed,
      },
      update: {
        csat: si.csat, availability: si.availability, basketPrice: si.basketPrice,
        rankScore: demand.rankScore, demandShare: demand.demandShare,
        grossRevenue: ebitda.grossRevenue, taxAmount: ebitda.taxAmount,
        netRevenue: ebitda.netRevenue, costOfGoods: ebitda.costOfGoods,
        breakageAmount: ebitda.breakageAmount, agingAmount: ebitda.agingAmount,
        payrollCost: ebitda.payrollCost, maintenanceCost: ebitda.maintenanceCost,
        licenseCost: ebitda.licenseCost, interestCost: ebitda.interestCost,
        slaRevenueLost: ebitda.slaRevenueLost, ebitda: ebitda.ebitda,
        ebitdaPercentage: ebitda.ebitdaPercentage, cashUsed: si.cashUsed,
      },
    });

    for (const event of slaEvents) {
      await prisma.slaEvent.upsert({
        where: { storeId_capexOptionId_round: { storeId: si.storeId, capexOptionId: event.capexOptionId, round } },
        create: { sessionId, storeId: si.storeId, capexOptionId: event.capexOptionId, round, occurred: event.occurred, daysDown: event.daysDown, revenueLost: event.revenueLost },
        update: { occurred: event.occurred, daysDown: event.daysDown, revenueLost: event.revenueLost },
      });
    }
  }
}

async function createPlan(
  storeId: string, configVersion: number, strategyIndex: number,
  categoryMap: Map<CategoryName, { id: string } & (typeof CATEGORY_DATA)[0]>,
  capexMap: Map<CapexType, { id: string } & (typeof CAPEX_DATA)[0]>,
  confirmed: boolean,
) {
  const strat = STORE_STRATEGIES[strategyIndex];
  const planCfg = configVersion === 1 ? strat.v1 : strat.v2;

  const plan = await prisma.operationalPlan.upsert({
    where: { storeId_configVersion: { storeId, configVersion } },
    create: { storeId, configVersion, cashierOperators: planCfg.cashierOps, serviceOperators: planCfg.serviceOps, confirmed, confirmedAt: confirmed ? new Date() : null },
    update: { cashierOperators: planCfg.cashierOps, serviceOperators: planCfg.serviceOps, confirmed, confirmedAt: confirmed ? new Date() : null },
  });

  for (const catData of CATEGORY_DATA) {
    const cat = categoryMap.get(catData.name)!;
    await prisma.poCategoryDecision.upsert({
      where: { planId_categoryId: { planId: plan.id, categoryId: cat.id } },
      create: { planId: plan.id, categoryId: cat.id, stockPurchased: planCfg.stock[catData.name], priceMargin: planCfg.margins[catData.name] },
      update: { stockPurchased: planCfg.stock[catData.name], priceMargin: planCfg.margins[catData.name] },
    });
  }

  for (const capexData of CAPEX_DATA) {
    const cap = capexMap.get(capexData.type)!;
    await prisma.poCapexDecision.upsert({
      where: { planId_capexOptionId: { planId: plan.id, capexOptionId: cap.id } },
      create: { planId: plan.id, capexOptionId: cap.id, implemented: planCfg.implementedCapex.includes(capexData.type) },
      update: { implemented: planCfg.implementedCapex.includes(capexData.type) },
    });
  }

  return plan;
}

async function createQuizQuestions(sessionId: string, round: 1 | 2 | 3) {
  const questions = QUIZ_ROUNDS[round];
  const created: { questionId: string; options: { id: string; isCorrect: boolean }[] }[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const question = await prisma.quizQuestion.upsert({
      where: { sessionId_round_order: { sessionId, round, order: i + 1 } },
      create: { sessionId, round, prompt: q.prompt, order: i + 1 },
      update: { prompt: q.prompt },
    });
    const opts: { id: string; isCorrect: boolean }[] = [];
    for (const opt of q.options) {
      const option = await prisma.quizOption.upsert({
        where: { id: (await prisma.quizOption.findFirst({ where: { questionId: question.id, label: opt.label } }))?.id ?? '' },
        create: { questionId: question.id, label: opt.label, isCorrect: opt.isCorrect },
        update: { isCorrect: opt.isCorrect },
      });
      opts.push({ id: option.id, isCorrect: opt.isCorrect });
    }
    created.push({ questionId: question.id, options: opts });
  }
  return created;
}

async function createQuizAnswers(
  sessionId: string, storeId: string, userId: string, round: 1 | 2 | 3,
  questions: { questionId: string; options: { id: string; isCorrect: boolean }[] }[],
  correctCount: number,
) {
  // Pick correctCount questions to answer correctly
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const answeredCorrectly = i < correctCount;
    const correctOpt = q.options.find(o => o.isCorrect)!;
    const wrongOpt = q.options.find(o => !o.isCorrect)!;
    const chosenOpt = answeredCorrectly ? correctOpt : (wrongOpt ?? correctOpt);

    await prisma.userQuizAnswer.upsert({
      where: { userId_questionId_round: { userId, questionId: q.questionId, round } },
      create: { sessionId, storeId, userId, questionId: q.questionId, optionId: chosenOpt.id, round, isCorrect: answeredCorrectly },
      update: { optionId: chosenOpt.id, isCorrect: answeredCorrectly },
    });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎮 Demo Seed — Retail Game Platform\n');

  // ── 1. Users ─────────────────────────────────────────────────────────────────

  const password = await hashPassword('senha123');

  const facilitator = await prisma.user.upsert({
    where: { email: 'facilitador@retail.game' },
    create: { name: 'Facilitador Demo', email: 'facilitador@retail.game', passwordHash: password, role: UserRole.FACILITATOR },
    update: {},
  });
  console.log(`  ✅ Facilitador: ${facilitator.email}`);

  const players: { id: string; email: string }[] = [];
  for (let i = 1; i <= 24; i++) {
    const num = String(i).padStart(2, '0');
    const p = await prisma.user.upsert({
      where: { email: `jogador${num}@retail.game` },
      create: { name: `Jogador ${num}`, email: `jogador${num}@retail.game`, passwordHash: password, role: UserRole.PLAYER },
      update: {},
    });
    players.push({ id: p.id, email: p.email });
  }
  console.log(`  ✅ 24 jogadores criados (senha: senha123)\n`);

  // ── 2. Category & CAPEX maps ──────────────────────────────────────────────────

  const categoryMap = new Map<CategoryName, { id: string } & (typeof CATEGORY_DATA)[0]>();
  for (const catData of CATEGORY_DATA) {
    const cat = await prisma.category.findUnique({ where: { name: catData.name } });
    if (!cat) { console.error(`  ❌ Categoria ${catData.name} não encontrada. Rode npm run seed primeiro.`); process.exit(1); }
    categoryMap.set(catData.name, { ...catData, id: cat.id });
  }

  const capexMap = new Map<CapexType, { id: string } & (typeof CAPEX_DATA)[0]>();
  for (const capexData of CAPEX_DATA) {
    const cap = await prisma.capexOption.findUnique({ where: { type: capexData.type } });
    if (!cap) { console.error(`  ❌ CAPEX ${capexData.type} não encontrado. Rode npm run seed primeiro.`); process.exit(1); }
    capexMap.set(capexData.type, { ...capexData, id: cap.id });
  }

  // ── Helper: create a session with 4 stores + members ─────────────────────────

  async function createSession(name: string, status: SessionStatus, playerOffset: number) {
    const existing = await prisma.session.findFirst({ where: { name } });
    if (existing) {
      console.log(`  ⏭  Sessão "${name}" já existe — pulando`);
      return null;
    }

    const session = await prisma.session.create({
      data: { name, status, facilitatorId: facilitator.id, totalDemand: 15700, initialCash: INITIAL_CASH },
    });

    // SessionCategoryConfig (usa padrão do seed)
    for (const catData of CATEGORY_DATA) {
      const cat = categoryMap.get(catData.name)!;
      await prisma.sessionCategoryConfig.create({ data: { sessionId: session.id, categoryId: cat.id, stockAvailable: catData.stockAvailable } });
    }

    const stores: { store: { id: string; name: string }; strategyIndex: number }[] = [];
    for (let si = 0; si < STORE_STRATEGIES.length; si++) {
      const strat = STORE_STRATEGIES[si];
      // Use unique access codes per session to avoid collision
      const code = strat.accessCode.slice(0, 3) + String(playerOffset).padStart(3, '0');
      const store = await prisma.store.create({ data: { sessionId: session.id, name: strat.storeName, accessCode: code } });

      for (let ri = 0; ri < ROLES.length; ri++) {
        const playerIdx = (si * 5 + ri) % players.length;
        await prisma.storeMember.create({ data: { storeId: store.id, userId: players[playerOffset + si * 5 + ri < players.length ? playerOffset + si * 5 + ri : (si * 5 + ri) % players.length].id, role: ROLES[ri] } });
      }

      stores.push({ store, strategyIndex: si });
    }

    return { session, stores };
  }

  // ── 3. Session 1: "Demo Completa" (FINISHED) ──────────────────────────────────

  console.log('📋 Criando sessão 1: Demo Completa (FINISHED)...');
  const s1Existing = await prisma.session.findFirst({ where: { name: 'Demo Completa' } });
  if (s1Existing) {
    console.log('  ⏭  Sessão "Demo Completa" já existe — pulando\n');
  } else {
    const session1 = await prisma.session.create({
      data: { name: 'Demo Completa', status: SessionStatus.FINISHED, facilitatorId: facilitator.id, totalDemand: 15700, initialCash: INITIAL_CASH },
    });

    for (const catData of CATEGORY_DATA) {
      const cat = categoryMap.get(catData.name)!;
      await prisma.sessionCategoryConfig.create({ data: { sessionId: session1.id, categoryId: cat.id, stockAvailable: catData.stockAvailable } });
    }

    const s1Stores: StoreRoundState[] = [];
    for (let si = 0; si < STORE_STRATEGIES.length; si++) {
      const strat = STORE_STRATEGIES[si];
      const store = await prisma.store.create({ data: { sessionId: session1.id, name: strat.storeName, accessCode: `${strat.accessCode}F` } });
      for (let ri = 0; ri < ROLES.length; ri++) {
        await prisma.storeMember.create({ data: { storeId: store.id, userId: players[si * 5 + ri].id, role: ROLES[ri] } });
      }
      s1Stores.push({ storeId: store.id, strategyIndex: si });
    }

    // Quiz questions for all 3 rounds
    const s1Questions: Record<1 | 2 | 3, Awaited<ReturnType<typeof createQuizQuestions>>> = {
      1: await createQuizQuestions(session1.id, 1),
      2: await createQuizQuestions(session1.id, 2),
      3: await createQuizQuestions(session1.id, 3),
    };

    // Round 1
    for (const ss of s1Stores) {
      await createPlan(ss.storeId, 1, ss.strategyIndex, categoryMap, capexMap, true);
      const strat = STORE_STRATEGIES[ss.strategyIndex];
      const score10 = Math.round(strat.quizScores[1] / 10); // correct out of 10
      // All 5 members answer the quiz
      for (let ri = 0; ri < ROLES.length; ri++) {
        const userId = players[ss.strategyIndex * 5 + ri].id;
        await createQuizAnswers(session1.id, ss.storeId, userId, 1, s1Questions[1], score10);
      }
      await prisma.quizAnswer.upsert({
        where: { storeId_round: { storeId: ss.storeId, round: 1 } },
        create: { storeId: ss.storeId, round: 1, totalQuestions: 10, correctAnswers: score10, scorePercentage: strat.quizScores[1] },
        update: { correctAnswers: score10, scorePercentage: strat.quizScores[1] },
      });
    }
    await runAndPersistRound(session1.id, s1Stores, 1, categoryMap, capexMap);
    console.log('    ✅ Rodada 1 calculada');

    // Round 2+3 plans
    for (const ss of s1Stores) {
      await createPlan(ss.storeId, 2, ss.strategyIndex, categoryMap, capexMap, true);
    }

    // Round 2
    for (const ss of s1Stores) {
      const strat = STORE_STRATEGIES[ss.strategyIndex];
      const score10 = Math.round(strat.quizScores[2] / 10);
      for (let ri = 0; ri < ROLES.length; ri++) {
        const userId = players[ss.strategyIndex * 5 + ri].id;
        await createQuizAnswers(session1.id, ss.storeId, userId, 2, s1Questions[2], score10);
      }
      await prisma.quizAnswer.upsert({
        where: { storeId_round: { storeId: ss.storeId, round: 2 } },
        create: { storeId: ss.storeId, round: 2, totalQuestions: 10, correctAnswers: score10, scorePercentage: strat.quizScores[2] },
        update: { correctAnswers: score10, scorePercentage: strat.quizScores[2] },
      });
    }
    await runAndPersistRound(session1.id, s1Stores, 2, categoryMap, capexMap);
    console.log('    ✅ Rodada 2 calculada');

    // Round 3
    for (const ss of s1Stores) {
      const strat = STORE_STRATEGIES[ss.strategyIndex];
      const score10 = Math.round(strat.quizScores[3] / 10);
      for (let ri = 0; ri < ROLES.length; ri++) {
        const userId = players[ss.strategyIndex * 5 + ri].id;
        await createQuizAnswers(session1.id, ss.storeId, userId, 3, s1Questions[3], score10);
      }
      await prisma.quizAnswer.upsert({
        where: { storeId_round: { storeId: ss.storeId, round: 3 } },
        create: { storeId: ss.storeId, round: 3, totalQuestions: 10, correctAnswers: score10, scorePercentage: strat.quizScores[3] },
        update: { correctAnswers: score10, scorePercentage: strat.quizScores[3] },
      });
    }
    await runAndPersistRound(session1.id, s1Stores, 3, categoryMap, capexMap);
    console.log('    ✅ Rodada 3 calculada');

    // Print results summary
    const results = await prisma.roundResult.findMany({
      where: { sessionId: session1.id },
      include: { store: { select: { name: true } } },
      orderBy: [{ round: 'asc' }, { ebitdaPercentage: 'desc' }],
    });
    const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
    console.log('\n  📊 Resultados — Demo Completa:');
    console.log('  ────────────────────────────────────────────────────────────');
    for (const r of results) {
      console.log(`  R${r.round} | ${r.store.name.padEnd(12)} | EBITDA: ${fmt(r.ebitda).padStart(14)} (${pct(r.ebitdaPercentage).padStart(6)}) | Demanda: ${pct(r.demandShare)}`);
    }
    console.log('  ────────────────────────────────────────────────────────────');

    // Cumulative ranking
    const storeNamesSet = new Set(results.map(r => r.store.name));
    const storeNames = Array.from(storeNamesSet);
    const cumulatives = storeNames.map(name => {
      const storeResults = results.filter(r => r.store.name === name);
      const totalGross = storeResults.reduce((s, r) => s + r.grossRevenue, 0);
      const totalEbitda = storeResults.reduce((s, r) => s + r.ebitda, 0);
      return { name, ebitdaPct: totalGross > 0 ? totalEbitda / totalGross : 0 };
    }).sort((a, b) => b.ebitdaPct - a.ebitdaPct);

    console.log('\n  🏆 Ranking Final:');
    const medals = ['🥇', '🥈', '🥉', '4️⃣ '];
    cumulatives.forEach((s, i) => console.log(`  ${medals[i]} ${s.name}: ${pct(s.ebitdaPct)}`));
    console.log();
  }

  // ── 4. Session 2: "Em Andamento" (RECONFIGURATION) ───────────────────────────

  console.log('📋 Criando sessão 2: Em Andamento (RECONFIGURATION)...');
  const s2Existing = await prisma.session.findFirst({ where: { name: 'Em Andamento' } });
  if (s2Existing) {
    console.log('  ⏭  Já existe — pulando\n');
  } else {
    const session2 = await prisma.session.create({
      data: { name: 'Em Andamento', status: SessionStatus.RECONFIGURATION, facilitatorId: facilitator.id, totalDemand: 15700, initialCash: INITIAL_CASH },
    });

    for (const catData of CATEGORY_DATA) {
      const cat = categoryMap.get(catData.name)!;
      await prisma.sessionCategoryConfig.create({ data: { sessionId: session2.id, categoryId: cat.id, stockAvailable: catData.stockAvailable } });
    }

    const s2Questions1 = await createQuizQuestions(session2.id, 1);
    const s2Stores: StoreRoundState[] = [];

    for (let si = 0; si < STORE_STRATEGIES.length; si++) {
      const strat = STORE_STRATEGIES[si];
      const store = await prisma.store.create({ data: { sessionId: session2.id, name: strat.storeName, accessCode: `${strat.accessCode}R` } });
      for (let ri = 0; ri < ROLES.length; ri++) {
        await prisma.storeMember.create({ data: { storeId: store.id, userId: players[(si * 5 + ri) % 20].id, role: ROLES[ri] } });
      }
      s2Stores.push({ storeId: store.id, strategyIndex: si });

      await createPlan(store.id, 1, si, categoryMap, capexMap, true);

      const score10 = Math.round(strat.quizScores[1] / 10);
      for (let ri = 0; ri < ROLES.length; ri++) {
        const userId = players[(si * 5 + ri) % 20].id;
        await createQuizAnswers(session2.id, store.id, userId, 1, s2Questions1, score10);
      }
      await prisma.quizAnswer.upsert({
        where: { storeId_round: { storeId: store.id, round: 1 } },
        create: { storeId: store.id, round: 1, totalQuestions: 10, correctAnswers: score10, scorePercentage: strat.quizScores[1] },
        update: { correctAnswers: score10, scorePercentage: strat.quizScores[1] },
      });
    }

    await runAndPersistRound(session2.id, s2Stores, 1, categoryMap, capexMap);
    console.log('  ✅ Rodada 1 calculada, aguardando reconfiguração\n');
  }

  // ── 5. Session 3: "Aguardando POs" (ROUND_1_CONFIG) ──────────────────────────

  console.log('📋 Criando sessão 3: Aguardando POs (ROUND_1_CONFIG)...');
  const s3Existing = await prisma.session.findFirst({ where: { name: 'Aguardando POs' } });
  if (s3Existing) {
    console.log('  ⏭  Já existe — pulando\n');
  } else {
    const session3 = await prisma.session.create({
      data: { name: 'Aguardando POs', status: SessionStatus.ROUND_1_CONFIG, facilitatorId: facilitator.id, totalDemand: 15700, initialCash: INITIAL_CASH },
    });

    for (const catData of CATEGORY_DATA) {
      const cat = categoryMap.get(catData.name)!;
      await prisma.sessionCategoryConfig.create({ data: { sessionId: session3.id, categoryId: cat.id, stockAvailable: catData.stockAvailable } });
    }

    await createQuizQuestions(session3.id, 1);

    for (let si = 0; si < STORE_STRATEGIES.length; si++) {
      const strat = STORE_STRATEGIES[si];
      const store = await prisma.store.create({ data: { sessionId: session3.id, name: strat.storeName, accessCode: `${strat.accessCode}C` } });
      for (let ri = 0; ri < ROLES.length; ri++) {
        await prisma.storeMember.create({ data: { storeId: store.id, userId: players[(si * 5 + ri) % 20].id, role: ROLES[ri] } });
      }
      // Alpha e Beta com PO parcialmente preenchido (não confirmado), Sigma e Gamma sem PO
      if (si < 2) {
        await createPlan(store.id, 1, si, categoryMap, capexMap, false);
      }
    }
    console.log('  ✅ 4 lojas criadas, Alpha e Beta com PO em andamento (não confirmado)\n');
  }

  // ── 6. Session 4: "Sessão Nova" (SETUP) ──────────────────────────────────────

  console.log('📋 Criando sessão 4: Sessão Nova (SETUP)...');
  const s4Existing = await prisma.session.findFirst({ where: { name: 'Sessão Nova' } });
  if (s4Existing) {
    console.log('  ⏭  Já existe — pulando\n');
  } else {
    await prisma.session.create({
      data: { name: 'Sessão Nova', status: SessionStatus.SETUP, facilitatorId: facilitator.id, totalDemand: 15700, initialCash: INITIAL_CASH },
    });
    console.log('  ✅ Criada sem lojas (estado inicial)\n');
  }

  // ── Summary ───────────────────────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎉 Demo Seed concluído!\n');
  console.log('  Credenciais de acesso:');
  console.log('  Facilitador : facilitador@retail.game  /  senha123');
  console.log('  Jogadores   : jogador01@retail.game até jogador24@retail.game  /  senha123\n');
  console.log('  Sessões criadas:');
  console.log('  1. "Demo Completa"   — FINISHED       (3 rodadas completas, ranking disponível)');
  console.log('  2. "Em Andamento"    — RECONFIGURATION (rodada 1 concluída, aguardando PO v2)');
  console.log('  3. "Aguardando POs"  — ROUND_1_CONFIG  (lojas criadas, POs em preenchimento)');
  console.log('  4. "Sessão Nova"     — SETUP           (recém-criada, sem lojas)');
  console.log('═══════════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Erro no demo seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
