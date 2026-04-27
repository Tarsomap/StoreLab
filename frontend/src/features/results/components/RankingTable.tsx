'use client';

import { Trophy } from 'lucide-react';
import { formatBrl } from '@/lib/format-brl';
import type { RankingEntry } from '../types';
import { rankBadgeStyle, fmtPct, ebitdaClass } from '../lib';

interface RankingTableProps {
  ranking: RankingEntry[];
}

export function RankingTable({ ranking }: RankingTableProps) {
  const maxRounds = Math.max(...ranking.map((r) => r.rounds.length), 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Loja
            </th>
            {Array.from({ length: maxRounds }, (_, i) => (
              <th
                key={i}
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                R{i + 1} EBITDA%
              </th>
            ))}
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Média
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total EBITDA
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Caixa Final
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((entry) => {
            const lastRound = entry.rounds[entry.rounds.length - 1];
            return (
              <tr
                key={entry.storeId}
                className="border-b last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-4">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                    style={rankBadgeStyle(entry.rank)}
                  >
                    {entry.rank}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-foreground">
                      {entry.storeName}
                    </span>
                    {entry.rank === 1 && (
                      <Trophy className="w-3.5 h-3.5 text-rank-1 shrink-0" />
                    )}
                  </div>
                </td>
                {Array.from({ length: maxRounds }, (_, i) => {
                  const r = entry.rounds.find((rr) => rr.round === i + 1);
                  return (
                    <td key={i} className="px-4 py-4 text-right">
                      {r ? (
                        <span
                          className={`font-mono text-sm font-medium ${ebitdaClass(
                            r.ebitdaPercentage,
                          )}`}
                        >
                          {fmtPct(r.ebitdaPercentage)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-4 text-right">
                  <span
                    className={`font-mono text-sm font-bold ${ebitdaClass(
                      entry.avgEbitdaPercentage,
                    )}`}
                  >
                    {fmtPct(entry.avgEbitdaPercentage)}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="font-mono text-sm text-foreground">
                    {formatBrl(entry.totalEbitda)}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  {lastRound ? (
                    <span
                      className={`font-mono text-sm font-semibold ${
                        lastRound.cashFinal >= 0 ? 'text-primary' : 'text-destructive'
                      }`}
                    >
                      {formatBrl(lastRound.cashFinal)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
