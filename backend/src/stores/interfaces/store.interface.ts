import { StoreRole } from '@prisma/client';

/**
 * Uma loja em que o usuário já está inscrito (para reentrada ou lista “minhas lojas”).
 */
export interface UserStoreEntry {
  storeId: string;
  storeName: string;
  sessionId: string;
  /** Papel na equipe (gerente de suprimentos, comercial, etc.). */
  role: StoreRole;
}

/**
 * Dados públicos básicos da loja após criar ou entrar — inclui o código que o time usa para convidar jogadores.
 */
export interface StoreSummary {
  id: string;
  sessionId: string;
  name: string;
  accessCode: string;
  createdAt: Date;
}

/**
 * Um jogador na lista de membros da loja (para o painel de equipe).
 */
export interface StoreMemberEntry {
  userId: string;
  name: string;
  email: string;
  role: StoreRole;
  joinedAt: Date;
}

/**
 * Resposta do endpoint de membros: identificação da loja + lista ordenada de quem já entrou.
 */
export interface StoreMembersResponse {
  storeId: string;
  storeName: string;
  members: StoreMemberEntry[];
}

/**
 * Confirmação após o facilitador mover um jogador de uma loja para outra na fase de reconfiguração.
 */
export interface TransferResponse {
  transferId: string;
  userId: string;
  fromStoreId: string;
  toStoreId: string;
  /** O papel acompanha o jogador — na loja nova ele continua no mesmo cargo (exceto gerente, que nem pode ser movido). */
  role: StoreRole;
  transferredAt: Date;
}

/**
 * Um dos dois sentidos registrados numa troca recíproca (A→B e B→A).
 */
export interface SwapMovement {
  transferId: string;
  userId: string;
  fromStoreId: string;
  toStoreId: string;
  transferredAt: Date;
}

/**
 * Confirmação após o facilitador trocar dois jogadores de mesmo papel entre duas lojas (swap atômico).
 * Os dois sentidos viram dois registros de transferência — assim a regra de saídas por loja continua contando certo.
 */
export interface SwapResponse {
  /** Papel compartilhado pelos dois jogadores trocados (o swap exige papéis iguais). */
  role: StoreRole;
  transfers: SwapMovement[];
}

/**
 * Status de transferências por loja para validar regra obrigatória na fase de reconfiguração.
 */
export interface TransferSummaryEntry {
  storeId: string;
  storeName: string;
  outboundTransfers: number;
  minimumRequired: number;
  maximumAllowed: number;
  requirementMet: boolean;
}

/**
 * Visão agregada da sessão: se todas as lojas já cumpriram a regra 1-2 transferências de saída.
 */
export interface TransferSessionSummary {
  sessionId: string;
  canAdvanceToRound2: boolean;
  stores: TransferSummaryEntry[];
}
