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
  members: StoreMember[];
}

export interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  stores: StoreStatus[];
}

export interface TransferSummaryEntry {
  storeId: string;
  storeName: string;
  outboundTransfers: number;
  minimumRequired: number;
  maximumAllowed: number;
  requirementMet: boolean;
}

export interface TransferSessionSummary {
  sessionId: string;
  canAdvanceToRound2: boolean;
  stores: TransferSummaryEntry[];
}
