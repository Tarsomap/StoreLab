export type SessionStatus =
  | 'SETUP'
  | 'ROUND_1_CONFIG'
  | 'ROUND_1'
  | 'RECONFIGURATION'
  | 'ROUND_2'
  | 'ROUND_3'
  | 'FINISHED';

export type StoreRole =
  | 'STORE_MANAGER'
  | 'SUPPLY_MANAGER'
  | 'COMMERCIAL_MANAGER'
  | 'OPERATIONAL_MANAGER'
  | 'SERVICE_MANAGER';

export interface StoreMember {
  userId: string;
  name: string;
  role: StoreRole;
}

export interface StoreStatus {
  storeId: string;
  storeName: string;
  accessCode: string;
  memberCount: number;
  members: StoreMember[];
  planConfirmed: boolean;
  cashUsed: number;
  availableCash: number;
  lastRound: number | null;
  lastRoundEbitda: number | null;
  lastRoundEbitdaPct: number | null;
}

export interface SessionDetail {
  id: string;
  name: string;
  status: SessionStatus;
  totalDemand: number;
  initialCash: number;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  stores: StoreStatus[];
}

/** Dashboard list shape — campos opcionais para compatibilidade com evolução da API. */
export interface Session {
  id: string;
  name: string;
  status: string;
  totalDemand: number;
  initialCash: number;
  disponibilidade?: number[];
  createdAt: string;
  storeCount?: number;
  confirmedPos?: number;
  stores?: unknown[];
  winnerStoreName?: string;
  winningStoreName?: string;
  firstPlaceStoreName?: string;
  winner?: { storeName?: string; name?: string };
}

export interface CategoryCatalogEntry {
  id: string;
  name: 'PERECIVEIS' | 'MERCEARIA' | 'ELETRO' | 'HIPEL';
  stockAvailable: number;
  unitCost: number;
  taxRate: number;
}

export interface RankingEntry {
  rank: number;
  storeId: string;
  storeName: string;
  avgEbitdaPercentage: number;
  totalEbitda: number;
  rounds: { round: number; ebitda: number; ebitdaPercentage: number; cashFinal: number }[];
}
