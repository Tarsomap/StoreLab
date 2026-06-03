'use client';

import { Trophy, Award, Medal } from 'lucide-react';
import { formatBrl } from '@/lib/format-brl';
import type { RankingEntry } from '../types';
import {
  ebitdaClass,
  fmtPct,
  rankGlowStyle,
  rankHeaderStyle,
  rankHeaderTextStyle,
  RANK_LABEL,
  RANK_MEDAL,
} from '../lib';

interface PodiumCardProps {
  entry: RankingEntry;
  podiumBaseStrip?: boolean;
}

export function PodiumCard({ entry, podiumBaseStrip = false }: PodiumCardProps) {
  const lastRound = entry.rounds[entry.rounds.length - 1];
  const isChampion = entry.rank === 1;
  const maxPct = Math.max(...entry.rounds.map((r) => Math.abs(r.ebitdaPercentage * 100)), 5);

  return (
    <div className="origin-center overflow-visible transition-transform duration-150 hover:scale-[1.02]">
      <div
        className="flex flex-col overflow-hidden rounded-2xl border border-border/20"
        style={rankGlowStyle(entry.rank)}
      >
      {/* Header band */}
      <div
        className="px-6 h-12 flex items-center justify-between"
        style={rankHeaderStyle(entry.rank)}
      >
        <div className="flex items-center gap-2">
          {entry.rank === 1 && (
            <Trophy className="w-4 h-4 shrink-0" style={rankHeaderTextStyle(1)} />
          )}
          {entry.rank === 2 && (
            <Award className="w-4 h-4 shrink-0" style={rankHeaderTextStyle(2)} />
          )}
          {entry.rank === 3 && (
            <Medal className="w-4 h-4 shrink-0" style={rankHeaderTextStyle(3)} />
          )}
          <span
            className="font-display font-bold text-xs tracking-widest uppercase"
            style={rankHeaderTextStyle(entry.rank)}
          >
            {RANK_LABEL[entry.rank] ?? '4º Lugar'}
          </span>
        </div>
        <span className="text-xl leading-none">{RANK_MEDAL[entry.rank] ?? ''}</span>
      </div>

      {/* Body */}
      <div className="bg-card flex-1 p-5 space-y-4">
        {isChampion && (
          <div className="flex items-center gap-1.5 -mt-1">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                background: 'hsla(45,93%,47%,0.12)',
                color: 'hsl(38,80%,30%)',
              }}
            >
              ★ Campeão
            </span>
          </div>
        )}

        <h3 className="font-display font-bold text-lg leading-snug text-foreground">
          {entry.storeName}
        </h3>

        {/* EBITDA Final — hero number */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">EBITDA Final</p>
          <p
            className={`font-mono font-bold leading-none ${entry.totalEbitda >= 0 ? 'text-accent' : 'text-destructive'} ${
              isChampion ? 'text-5xl' : 'text-3xl'
            }`}
          >
            {formatBrl(entry.totalEbitda)}
          </p>
        </div>

        {/* Per-round progress bars — ordenadas por EBITDA R$ */}
        <div className="space-y-2">
          {[...entry.rounds]
            .sort((a, b) => b.ebitda - a.ebitda)
            .map((r) => {
              const pctVal = r.ebitdaPercentage * 100;
              const barWidth = Math.min((Math.abs(pctVal) / maxPct) * 100, 100);
              return (
                <div key={r.round} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground w-4 shrink-0">
                    R{r.round}
                  </span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pctVal >= 0 ? 'bg-accent' : 'bg-destructive'
                      }`}
                      style={{ width: `${barWidth}%`, transition: 'width 1s ease-out' }}
                    />
                  </div>
                  <span
                    className={`font-mono text-xs font-semibold w-12 text-right shrink-0 ${ebitdaClass(
                      r.ebitdaPercentage,
                    )}`}
                  >
                    {fmtPct(r.ebitdaPercentage)}
                  </span>
                  <span
                    className={`font-mono text-xs w-20 text-right shrink-0 ${ebitdaClass(
                      r.ebitdaPercentage,
                    )}`}
                  >
                    {formatBrl(r.ebitda)}
                  </span>
                </div>
              );
            })}
        </div>

        {/* EBITDA Médio + Caixa Final */}
        <div className="pt-3 border-t border-border/40 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">EBITDA Médio</p>
            <p
              className={`font-mono font-bold text-base ${ebitdaClass(entry.avgEbitdaPercentage)}`}
            >
              {fmtPct(entry.avgEbitdaPercentage)}
            </p>
          </div>
          {lastRound && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Caixa Final</p>
              <p
                className={`font-mono font-bold text-base ${
                  lastRound.cashFinal >= 0 ? 'text-primary' : 'text-destructive'
                }`}
              >
                {formatBrl(lastRound.cashFinal)}
              </p>
            </div>
          )}
        </div>
      </div>

      {podiumBaseStrip && (
        <div className="h-3 shrink-0" style={rankHeaderStyle(entry.rank)} aria-hidden />
      )}
    </div>
    </div>
  );
}