import { SessionStatus, StoreRole } from '@prisma/client';

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

export interface StoreMemberStatus {
  userId: string;
  name: string;
  role: StoreRole;
}

export interface StoreStatusEntry {
  storeId: string;
  storeName: string;
  accessCode: string;
  memberCount: number;
  members: StoreMemberStatus[];
  planConfirmed: boolean;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  stores: StoreStatusEntry[];
}
