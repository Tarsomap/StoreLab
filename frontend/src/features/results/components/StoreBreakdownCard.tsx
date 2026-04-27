'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { StoreResultEntry } from '../types';
import { rankBadgeStyle, fmtPct } from '../lib';
import { RoundBreakdown } from './RoundBreakdown';

interface StoreBreakdownCardProps {
  store: StoreResultEntry;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function StoreBreakdownCard({ store, rank, isExpanded, onToggle }: StoreBreakdownCardProps) {
  return (
    <Card className="rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
              style={rankBadgeStyle(rank)}
            >
              {rank}
            </span>
            <span className="font-display font-semibold text-base text-foreground">
              {store.storeName}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {store.rounds.map((r) => (
              <span
                key={r.round}
                className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                  r.ebitdaPercentage >= 0
                    ? 'bg-accent/10 text-accent'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                R{r.round}: {fmtPct(r.ebitdaPercentage)}
              </span>
            ))}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <CardContent className="border-t pt-4 space-y-4 bg-background/50">
          {store.rounds.map((r) => (
            <RoundBreakdown key={r.round} round={r} initialCash={store.initialCash} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
