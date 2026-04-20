import type { SessionStatus, StoreRole } from '../types';

export const PHASE_LABEL: Record<SessionStatus, string> = {
  SETUP: '1ª Configuração — Preparação',
  ROUND_1_CONFIG: '1ª Configuração — Aguardando POs',
  ROUND_1: 'Rodada 1 em andamento',
  RECONFIGURATION: '2ª Configuração (Reconfiguração)',
  ROUND_2: 'Rodada 2 em andamento',
  ROUND_3: 'Rodada 3 em andamento',
  FINISHED: 'Resultado Final',
};

export const PHASE_STEPS: { label: string; statuses: SessionStatus[] }[] = [
  { label: '1ª Configuração', statuses: ['SETUP', 'ROUND_1_CONFIG'] },
  { label: 'Rodada 1', statuses: ['ROUND_1'] },
  { label: '2ª Configuração', statuses: ['RECONFIGURATION'] },
  { label: 'Rodada 2', statuses: ['ROUND_2'] },
  { label: 'Rodada 3', statuses: ['ROUND_3'] },
  { label: 'Resultado', statuses: ['FINISHED'] },
];

export const ROLE_LABELS: Record<StoreRole, string> = {
  STORE_MANAGER: 'Gerente da Loja',
  SUPPLY_MANAGER: 'Abastecimento',
  COMMERCIAL_MANAGER: 'Comercial',
  OPERATIONAL_MANAGER: 'Operacional',
  SERVICE_MANAGER: 'Serviços',
};

export const STATUS_PROGRESS: Record<string, string> = {
  SETUP: 'Configuração',
  ROUND_1_CONFIG: 'Configuração R.1',
  ROUND_1: 'Rodada 1 de 3',
  RECONFIGURATION: 'Reconfiguração',
  ROUND_2: 'Rodada 2 de 3',
  ROUND_3: 'Rodada 3 de 3',
  FINISHED: 'Finalizada',
};

export function getActiveStepIndex(status: SessionStatus): number {
  return PHASE_STEPS.findIndex((s) => s.statuses.includes(status));
}

export function facilitatorQuizRound(status: SessionStatus): 1 | 2 | 3 | null {
  switch (status) {
    case 'ROUND_1_CONFIG':
    case 'ROUND_1':
      return 1;
    case 'RECONFIGURATION':
    case 'ROUND_2':
      return 2;
    case 'ROUND_3':
      return 3;
    default:
      return null;
  }
}

/** Extrai nome da loja campeã de vários formatos possíveis da API (compatibilidade). */
export function formatSessionWinner(session: {
  winnerStoreName?: string;
  winningStoreName?: string;
  firstPlaceStoreName?: string;
  winner?: { storeName?: string; name?: string };
}): string {
  if (typeof session.winnerStoreName === 'string' && session.winnerStoreName.trim()) {
    return session.winnerStoreName.trim();
  }
  if (typeof session.winningStoreName === 'string' && session.winningStoreName.trim()) {
    return session.winningStoreName.trim();
  }
  if (typeof session.firstPlaceStoreName === 'string' && session.firstPlaceStoreName.trim()) {
    return session.firstPlaceStoreName.trim();
  }
  const w = session.winner;
  if (w) {
    if (typeof w.storeName === 'string' && w.storeName.trim()) return w.storeName.trim();
    if (typeof w.name === 'string' && w.name.trim()) return w.name.trim();
  }
  return '—';
}

export function formatStoreCount(session: { storeCount?: number; stores?: unknown[] }): string {
  if (typeof session.storeCount === 'number' && Number.isFinite(session.storeCount)) {
    return String(session.storeCount);
  }
  if (Array.isArray(session.stores)) {
    return String(session.stores.length);
  }
  return '—';
}

export function formatConfirmedStores(session: { confirmedPos?: number; storeCount?: number }): string {
  const c = session.confirmedPos;
  const sc = session.storeCount;
  const hasC = typeof c === 'number' && Number.isFinite(c);
  const hasSc = typeof sc === 'number' && Number.isFinite(sc);
  if (hasC && hasSc) return `${c}/${sc}`;
  return '—/—';
}

export function sumTrainedStoresForFinished(
  finished: { storeCount?: number }[],
): number | '—' {
  if (finished.length === 0) return 0;
  let sum = 0;
  for (const s of finished) {
    if (typeof s.storeCount === 'number' && Number.isFinite(s.storeCount)) {
      sum += s.storeCount;
    } else {
      return '—';
    }
  }
  return sum;
}

/** Cores por loja — alinhadas às categorias do design system (CLAUDE.md). */
export const STORE_LINE_COLORS = [
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(217 91% 60%)',
  'hsl(280 68% 60%)',
];

export type EbitdaChartRow = { round: number } & Record<string, number | null>;

const ROUNDS_AXIS = [1, 2, 3] as const;

export function buildEbitdaChartRows(
  ranking: { storeId: string; rounds: { round: number; ebitdaPercentage: number }[] }[],
): EbitdaChartRow[] {
  return ROUNDS_AXIS.map((round) => {
    const row: EbitdaChartRow = { round };
    for (const entry of ranking) {
      const hit = entry.rounds.find((x) => x.round === round);
      row[entry.storeId] = hit != null ? hit.ebitdaPercentage : null;
    }
    return row;
  });
}

export function rankingHasRoundData(
  ranking: { rounds: unknown[] }[],
): boolean {
  return ranking.some((e) => e.rounds.length > 0);
}
