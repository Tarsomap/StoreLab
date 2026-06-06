import { SessionStatus, StoreRole } from "@prisma/client";

/**
 * Visão resumida de uma sessão para listagens e respostas simples (sem lojas aninhadas).
 */
export interface SessionSummary {
  id: string;
  name: string;
  /** Em que etapa da partida estamos — só avança com PATCH advance, nunca pula fases. */
  status: SessionStatus;
  facilitatorId: string;
  totalDemand: number;
  initialCash: number;
  disponibilidade: number[];

  timerEnabled: boolean;
  timerDuration: number | null;
  timerStartedAt: Date | null;
  timerPausedAt: Date | null;
  elapsedBeforePause: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Um jogador vinculado à loja, com papel (gerente, caixa, etc.) para o painel do facilitador.
 */
export interface StoreMemberStatus {
  userId: string;
  name: string;
  role: StoreRole;
}

/**
 * Situação de uma loja dentro da sessão: equipe, PO confirmado, caixa usado e último resultado de rodada.
 */
export interface StoreStatusEntry {
  storeId: string;
  storeName: string;
  /** Código que os jogadores usam para entrar na loja. */
  accessCode: string;
  memberCount: number;
  members: StoreMemberStatus[];
  /**
   * Se o plano operacional mais recente já foi confirmado — o facilitador usa isso para saber se pode fechar a fase
   * e deixar ninguém para trás antes de avançar o estado da sessão.
   */
  planConfirmed: boolean;
  /** Estimativa de caixa comprometido no último plano (compra + CAPEX implementado). */
  cashUsed: number;
  /** Quanto ainda “sobra” do caixa inicial após esse compromisso (visão rápida para o painel). */
  availableCash: number;
  /** Última rodada com resultado gravado, se houver. */
  lastRound: number | null;
  lastRoundEbitda: number | null;
  lastRoundEbitdaPct: number | null;
}

/**
 * Retorno do endpoint de status: fase atual da partida + snapshot de todas as lojas para o dashboard.
 */
export interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  stores: StoreStatusEntry[];
}

/**
 * Uma linha do relatório de estoque compartilhado: quanto a sessão permite, quanto já foi comprado e o que resta.
 */
export interface StockAvailabilityEntry {
  categoryId: string;
  categoryName: string;
  /** Teto da sessão (ou padrão da categoria se não houver config específica). */
  totalAvailable: number;
  /** Soma das compras de todas as lojas naquela versão de plano — para ninguém estourar o pool sozinho sem o grupo ver. */
  totalPurchased: number;
  /** Espaço ainda disponível para novas compras naquela configuração. */
  remaining: number;
}

/**
 * Catálogo de categorias disponível para o facilitador parametrizar estoque na criação da sessão.
 */
export interface SessionCategoryCatalogEntry {
  id: string;
  name: string;
  stockAvailable: number;
  unitCost: number;
  taxRate: number;
}

/**
 * Catálogo de eventos predefinidos disponível para o facilitador configurar nas rodadas.
 */
export interface SessionEventCatalogEntry {
  id: string;
  name: string;
  description: string;
}
