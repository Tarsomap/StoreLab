import type { CSSProperties } from 'react';
import type { RankingEntry } from '../types';

export const fmtPct = (n: number): string => `${(n * 100).toFixed(1)}%`;

export const fmtNum = (n: number): string =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export const ebitdaClass = (pct: number): string =>
  pct >= 0 ? 'text-accent' : 'text-destructive';

export function rankHeaderStyle(rank: number): CSSProperties {
  switch (rank) {
    case 1:
      return { background: 'linear-gradient(135deg, hsl(45,93%,52%) 0%, hsl(38,92%,44%) 100%)' };
    case 2:
      return { background: 'linear-gradient(135deg, hsl(210,11%,80%) 0%, hsl(210,11%,62%) 100%)' };
    case 3:
      return { background: 'linear-gradient(135deg, hsl(29,55%,58%) 0%, hsl(29,49%,44%) 100%)' };
    default:
      return { background: 'linear-gradient(135deg, hsl(220,9%,72%) 0%, hsl(220,9%,58%) 100%)' };
  }
}

export function rankGlowStyle(rank: number): CSSProperties {
  switch (rank) {
    case 1:
      return { boxShadow: '0 0 52px hsla(45,93%,47%,0.32), 0 8px 28px rgba(0,0,0,0.12)' };
    case 2:
      return { boxShadow: '0 4px 20px rgba(0,0,0,0.09)' };
    case 3:
      return { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' };
    default:
      return { boxShadow: '0 2px 10px rgba(0,0,0,0.06)' };
  }
}

export function rankBadgeStyle(rank: number): CSSProperties {
  switch (rank) {
    case 1:
      return {
        background: 'linear-gradient(135deg, hsl(45,93%,52%), hsl(38,92%,44%))',
        color: 'hsl(45,80%,18%)',
      };
    case 2:
      return {
        background: 'linear-gradient(135deg, hsl(210,11%,72%), hsl(210,11%,58%))',
        color: 'hsl(210,11%,18%)',
      };
    case 3:
      return {
        background: 'linear-gradient(135deg, hsl(29,55%,56%), hsl(29,49%,43%))',
        color: 'hsl(29,49%,16%)',
      };
    default:
      return { background: 'hsl(220,9%,62%)', color: 'white' };
  }
}

export function rankHeaderTextStyle(rank: number): CSSProperties {
  switch (rank) {
    case 1:
      return { color: 'hsl(45,80%,18%)' };
    case 2:
      return { color: 'hsl(210,11%,20%)' };
    case 3:
      return { color: 'hsl(29,49%,16%)' };
    default:
      return { color: 'white' };
  }
}

export const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '' };

export const RANK_LABEL: Record<number, string> = {
  1: '1º Lugar',
  2: '2º Lugar',
  3: '3º Lugar',
  4: '4º Lugar',
};

export function computePodiumOrder(ranking: RankingEntry[]): {
  podiumTop: RankingEntry[];
  fourthPlace: RankingEntry | undefined;
} {
  const podiumTop = [
    ranking.find((r) => r.rank === 2),
    ranking.find((r) => r.rank === 1),
    ranking.find((r) => r.rank === 3),
  ].filter((e): e is RankingEntry => e !== undefined);

  const fourthPlace = ranking.find((r) => r.rank === 4);

  return { podiumTop, fourthPlace };
}

export function computeStoreRankMap(ranking: RankingEntry[]): Record<string, number> {
  const storeRankMap: Record<string, number> = {};
  ranking.forEach((e) => {
    storeRankMap[e.storeId] = e.rank;
  });
  return storeRankMap;
}
