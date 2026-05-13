export interface Store {
  id: string;
  name: string;
  sessionId: string;
  accessCode: string;
  createdAt: string;
}

export interface UpdateStoreInput {
  name?: string;
}
