'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Session, RankingEntry } from '../types';
import {
  buildEbitdaChartRows,
  rankingHasRoundData,
  STORE_LINE_COLORS,
} from '../lib/session-phases';

function EbitdaLineTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const roundLabel =
    typeof label === 'number' ? `Rodada ${label}` : `Rodada ${String(label ?? '')}`;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {roundLabel}
      </p>
      <ul className="space-y-1">
        {payload.map((item) => {
          const v = item.value;
          const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
          const pct = Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
          return (
            <li key={String(item.dataKey)} className="flex items-baseline justify-between gap-6">
              <span className="font-medium text-foreground" style={{ color: item.color }}>
                {item.name}
              </span>
              <span className="font-mono tabular-nums text-foreground">{pct}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface HistoricPerformanceSectionProps {
  finishedSessions: Session[];
}

/**
 * Bloco "Desempenho histórico": seletor de sessão finalizada + GET ranking + gráfico de linhas.
 * API: ao mudar sessão, busca `/results/:id/ranking`.
 */
export function HistoricPerformanceSection({ finishedSessions }: HistoricPerformanceSectionProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    () => finishedSessions[0]?.id ?? null,
  );
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState(false);

  useEffect(() => {
    if (finishedSessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }
    setSelectedSessionId((prev) => {
      if (prev && finishedSessions.some((s) => s.id === prev)) return prev;
      return finishedSessions[0].id;
    });
  }, [finishedSessions]);

  useEffect(() => {
    if (!selectedSessionId) return;
    let cancelled = false;
    setRankingLoading(true);
    setRankingError(false);
    setRanking(null);
    api
      .get<RankingEntry[]>(`/results/${selectedSessionId}/ranking`)
      .then((data) => { if (!cancelled) setRanking(data); })
      .catch(() => { if (!cancelled) { setRankingError(true); setRanking(null); } })
      .finally(() => { if (!cancelled) setRankingLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSessionId]);

  const chartData = useMemo(() => (ranking ? buildEbitdaChartRows(ranking) : []), [ranking]);
  const showChart = !rankingLoading && !rankingError && ranking !== null && rankingHasRoundData(ranking);

  return (
    <section className="space-y-4" aria-labelledby="historic-performance-heading">
      <h3 id="historic-performance-heading" className="font-display text-xl font-bold text-foreground">
        Desempenho Histórico
      </h3>
      <Card className="rounded-xl border shadow-sm transition-colors duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base font-semibold text-foreground">
            EBITDA % por rodada
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Comparativo das lojas nas rodadas 1 a 3 da sessão selecionada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {finishedSessions.length >= 1 && selectedSessionId && (
            <div className="space-y-2 max-w-md">
              <Label htmlFor="historic-session" className="text-sm text-muted-foreground">
                Sessão
              </Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger id="historic-session" className="w-full">
                  <SelectValue placeholder="Escolha a sessão" />
                </SelectTrigger>
                <SelectContent>
                  {finishedSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {rankingLoading && <div className="h-48 w-full animate-pulse rounded-xl bg-muted" aria-hidden />}

          {rankingError && (
            <p className="text-sm text-destructive">Não foi possível carregar os dados.</p>
          )}

          {!rankingLoading && !rankingError && ranking !== null && !rankingHasRoundData(ranking) && (
            <p className="text-sm text-muted-foreground">
              Nenhum resultado disponível para esta sessão.
            </p>
          )}

          {showChart && ranking && (
            <div className="h-72 w-full min-h-[288px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 88%)" />
                  <XAxis
                    dataKey="round"
                    type="number"
                    domain={[1, 3]}
                    ticks={[1, 2, 3]}
                    tickFormatter={(v) => `Rodada ${v}`}
                    className="text-xs text-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 'auto']}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                    className="text-xs text-muted-foreground"
                    width={48}
                  />
                  <Tooltip content={(props) => <EbitdaLineTooltip {...props} />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                  />
                  {ranking.map((entry, index) => (
                    <Line
                      key={entry.storeId}
                      type="monotone"
                      dataKey={entry.storeId}
                      name={entry.storeName}
                      stroke={STORE_LINE_COLORS[index % STORE_LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
