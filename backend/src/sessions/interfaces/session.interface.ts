import { SessionStatus } from '@prisma/client';

export interface SessionSummary {
  id: string;
  name: string;
  status: SessionStatus;
  facilitatorId: string;
  totalDemand: number;
  initialCash: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreStatusEntry {
  storeId: string;
  storeName: string;
  memberCount: number;
  planConfirmed: boolean;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  stores: StoreStatusEntry[];
}
