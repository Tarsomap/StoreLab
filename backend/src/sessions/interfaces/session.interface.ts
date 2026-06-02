import { SessionStatus } from "@prisma/client";

/**
 * Resumo de uma sessão — contrato estável entre serviço e controllers/frontend.
 * Inclui os três custos operacionais configurados pelo facilitador.
 */
export interface SessionSummary {
  id: string;
  name: string;
  status: SessionStatus;
  facilitatorId: string;
  totalDemand: number;
  initialCash: number;
  disponibilidade: number[];

  /** Salário por operador de caixa (R$) — base do cálculo de folha. */
  cashierSalary: number;
  /** Salário por operador de serviço (R$) — base do cálculo de folha. */
  serviceSalary: number;
  /** Custo base de licença de software (R$) — somado aos deltas de CAPEX. */
  baseLicenseCost: number;

  timerEnabled: boolean;
  timerDuration: number | null;
  timerStartedAt: Date | null;
  timerPausedAt: Date | null;
  elapsedBeforePause: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionCategoryCatalogEntry {
  id: string;
  name: string;
  stockAvailable: number;
  unitCost: number;
  taxRate: number;
}

export interface StockAvailabilityEntry {
  categoryId: string;
  categoryName: string;
  totalAvailable: number;
  totalPurchased: number;
  remaining: number;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  stores: SessionStoreStatus[];
}

export interface SessionStoreStatus {
  storeId: string;
  storeName: string;
  accessCode: string;
  memberCount: number;
  members: { userId: string; name: string; role: string }[];
  planConfirmed: boolean;
  cashUsed: number;
  availableCash: number;
  lastRound: number | null;
  lastRoundEbitda: number | null;
  lastRoundEbitdaPct: number | null;
}
