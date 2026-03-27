export interface CategoryDecisionEntry {
  id: string;
  categoryId: string;
  categoryName: string;
  unitCost: number;
  stockPurchased: number;
  priceMargin: number;
  lineCost: number; // stockPurchased × unitCost
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
  confirmedAt: Date | null;
  categoryDecisions: CategoryDecisionEntry[];
  capexDecisions: CapexDecisionEntry[];
  financials: PlanFinancials;
}
