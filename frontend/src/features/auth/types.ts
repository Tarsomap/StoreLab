export type StoreRole =
  | 'STORE_MANAGER'
  | 'SUPPLY_MANAGER'
  | 'COMMERCIAL_MANAGER'
  | 'OPERATIONAL_MANAGER'
  | 'SERVICE_MANAGER';

export const ROLE_LABELS: Record<StoreRole, string> = {
  STORE_MANAGER: 'Gerente da Loja',
  SUPPLY_MANAGER: 'Gerente de Abastecimento',
  COMMERCIAL_MANAGER: 'Gerente Comercial',
  OPERATIONAL_MANAGER: 'Gerente Operacional',
  SERVICE_MANAGER: 'Gerente de Serviços',
};

export interface JoinResponse {
  id: string;
  name: string;
  sessionId: string;
}

export interface UserStoreEntry {
  storeId: string;
  storeName: string;
  sessionId: string;
  role: StoreRole;
}
