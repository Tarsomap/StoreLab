export type StoreRole =
  | 'STORE_MANAGER'
  | 'SUPPLY_MANAGER'
  | 'COMMERCIAL_MANAGER'
  | 'OPERATIONAL_MANAGER'
  | 'SERVICE_MANAGER';

export interface CategoryDecisionEntry {
  id: string;
  categoryId: string;
  categoryName: string;
  unitCost: number;
  taxRate: number;
  breakageRate: number;
  agingRate: number;
  stockPurchased: number;
  priceMargin: number;
  lineCost: number;
}

export interface CapexDecisionEntry {
  id: string;
  capexOptionId: string;
  capexName: string;
  acquisitionCost: number;
  implemented: boolean;
}

export interface PlanFinancials {
  cashUsed: number;
  availableCash: number;
  interestCost: number;
  payrollCost: number;
  maintenanceCost: number;
  licenseCost: number;
  projectedGrossRevenue: number;
  projectedEbitda: number;
  projectedEbitdaPercentage: number;
}

export interface PlanFullResponse {
  id: string;
  storeId: string;
  configVersion: number;
  cashierOperators: number;
  serviceOperators: number;
  confirmed: boolean;
  confirmedAt: string | null;
  categoryDecisions: CategoryDecisionEntry[];
  capexDecisions: CapexDecisionEntry[];
  financials: PlanFinancials;
}

export interface StoreSummary {
  id: string;
  sessionId: string;
  name: string;
  accessCode: string;
}

export interface StockAvailabilityEntry {
  categoryId: string;
  categoryName: string;
  totalAvailable: number;
  totalPurchased: number;
  remaining: number;
}

export interface PlayerScoreResponse {
  answered: boolean;
  correctAnswers: number;
  totalQuestions: number;
  scorePercentage: number;
}

export interface StoreMemberEntry {
  userId: string;
  name: string;
  role: StoreRole;
}

export type ConfirmState = 'idle' | 'loading' | 'success' | 'error';

export interface CatRow extends CategoryDecisionEntry {
  sellPrice: number;
  totalVenda: number;
  impostos: number;
  totalEstoque: number;
  quebrasR: number;
  agingR: number;
}

export interface DreLines {
  totalVendas: number;
  impostos: number;
  vendaLiquida: number;
  custoVenda: number;
  massaMgLiquida: number;
  quebras: number;
  aging: number;
  massaFinal: number;
  folha: number;
  manutencao: number;
  juros: number;
  licencas: number;
  ebitda: number;
  ebitdaPct: number;
}
