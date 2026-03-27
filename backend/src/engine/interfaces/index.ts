export interface CategoryEngineInput {
  categoryId: string;
  categoryName: string;
  unitCost: number;
  taxRate: number;
  breakageRate: number;
  agingRate: number;
  sessionStockAvailable: number;
  stockPurchased: number;
  priceMargin: number;
}

export interface CapexEngineInput {
  capexOptionId: string;
  type: string;
  acquisitionCost: number;
  downtimeFixedDays: number;
  monthlyLicenseDelta: number;
  maintenanceSaving: number;
  slaRiskPercent: number;
  implemented: boolean;
}

export interface StoreIndicators {
  storeId: string;
  csat: number;
  availability: number;
  basketPrice: number;
}

export interface DemandResult {
  storeId: string;
  priceRank: number;
  availabilityRank: number;
  csatRank: number;
  rankScore: number;
  demandShare: number;
}

export interface ShrinkageCategoryInput {
  categoryId: string;
  unitCost: number;
  breakageRate: number;
  agingRate: number;
  totalUnsold: number;
}

export interface ShrinkageCategoryResult {
  categoryId: string;
  breakageAmount: number;
  agingAmount: number;
}

export interface ShrinkageResult {
  categories: ShrinkageCategoryResult[];
  totalBreakage: number;
  totalAging: number;
}

export interface CategoryRevenueResult {
  categoryId: string;
  stockSold: number;
  unsoldStock: number;
  grossRevenue: number;
  taxAmount: number;
  costOfGoods: number;
}

export interface EbitdaInput {
  categoryRevenues: CategoryRevenueResult[];
  cashierOperators: number;
  serviceOperators: number;
  capexDecisions: CapexEngineInput[];
  cashUsed: number;
  interestThreshold: number;
  slaRevenueLost: number;
  shrinkage: ShrinkageResult;
}

export interface EbitdaBreakdown {
  categoryRevenues: CategoryRevenueResult[];
  grossRevenue: number;
  taxAmount: number;
  netRevenue: number;
  costOfGoods: number;
  breakageAmount: number;
  agingAmount: number;
  payrollCost: number;
  maintenanceCost: number;
  licenseCost: number;
  interestCost: number;
  slaRevenueLost: number;
  ebitda: number;
  ebitdaPercentage: number;
}

export interface SlaInput {
  sessionId: string;
  storeId: string;
  round: number;
  serviceOperators: number;
  capexDecisions: CapexEngineInput[];
  grossRevenue: number;
}

export interface SlaEventResult {
  capexOptionId: string;
  capexType: string;
  occurred: boolean;
  daysDown: number;
  revenueLost: number;
}

export interface SlaResult {
  events: SlaEventResult[];
  totalRevenueLost: number;
}
