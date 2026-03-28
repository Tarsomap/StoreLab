export interface RoundResultEntry {
  round: number;
  csat: number;
  availability: number;
  basketPrice: number;
  rankScore: number;
  demandShare: number;
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
  cashUsed: number;
  cashFinal: number;
}

export interface StoreResultEntry {
  storeId: string;
  storeName: string;
  initialCash: number;
  rounds: RoundResultEntry[];
}

export interface RankingEntry {
  rank: number;
  storeId: string;
  storeName: string;
  avgEbitdaPercentage: number;
  totalEbitda: number;
  rounds: { round: number; ebitda: number; ebitdaPercentage: number; cashFinal: number }[];
}
