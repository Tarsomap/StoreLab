import { StoreRole } from '@prisma/client';

export interface StoreSummary {
  id: string;
  sessionId: string;
  name: string;
  accessCode: string;
  createdAt: Date;
}

export interface StoreMemberEntry {
  userId: string;
  name: string;
  email: string;
  role: StoreRole;
  joinedAt: Date;
}

export interface StoreMembersResponse {
  storeId: string;
  storeName: string;
  members: StoreMemberEntry[];
}
