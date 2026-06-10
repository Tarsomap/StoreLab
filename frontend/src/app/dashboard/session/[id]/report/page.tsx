'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useResults } from '@/features/results/hooks';
import { formatBrl } from '@/lib/format-brl';
import { ResultsSkeleton } from '@/components/skeletons/results-skeleton';

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const RANK_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-[hsl(45_93%_47%)]/10', text: 'text-[hsl(45_93%_47%)]', label: '1º' },
  2: { bg: 'bg-[hsl(210_11%_71%)]/10', text: 'text-[hsl(210_11%_71%)]', label: '2º' },
  3: { bg: 'bg-[hsl(29_49%_47%)]/10', text: 'text-[hsl(29_49%_47%)]', label: '3º' },
  4: { bg: 'bg-muted', text: 'text-muted-foreground', label: '4º' },
};

const METRIC_ROWS: { key: keyof import('@/features/results/types').RoundResultEntry; label: string; format: (v: number) => string; invert?: boolean }[] = [
  { key: 'grossRevenue', label: 'Receita Bruta', format: formatBrl },
  { key: 'netRevenue', label: 'Receita Líquida', format: formatBrl },
  { key: 'costOfGoods', label: 'CMV', format: formatBrl, invert: true },
  { key: 'payrollCost', label: 'Folha Salarial', format: formatBrl, invert: true },
  { key: 'licenseCost', label: 'Licenças', format: formatBrl, invert: true },
  { key: 'maintenanceCost', label: 'Manutenção', format: formatBrl, invert: true },
  { key: 'interestCost', label: 'Juros', format: formatBrl, invert: true },
  { key: 'slaRevenueLost', label: 'Perda SLA', format: formatBrl, invert: true },
  { key: 'ebitda', label: 'EBITDA', format: formatBrl },
  { key: 'ebitdaPercentage', label: '%EBITDA', format: fmtPct },
  { key: 'csat', label: 'CSAT', format: (v) => fmtPct(v) },
  { key: 'availability', label: 'Disponibilidade', format: fmtPct },
];

export default function ConsolidatedReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  const { ranking, storeResults, loading, error } = useResults(sessionId);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <ResultsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const rounds = Array.from(new Set(storeResults.flatMap((s) => s.rounds.map((r) => r.round)))).sort((a, b) => a - b);
  const rankMap = new Map(ranking.map((r) => [r.storeId, r.rank]));
  const sortedStores = [...storeResults].sort(
    (a, b) => (rankMap.get(a.storeId) ?? 99) - (rankMap.get(b.storeId) ?? 99),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/session/${sessionId}`)}
            className="text-muted-foreground px-0 hover:bg-transparent"
          >
            ← Sessão
          </Button>
          <span>/</span>
          <span className="font-medium text-foreground">Relatório Consolidado</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/session/${sessionId}/results`)}
        >
          Ver Pódio
        </Button>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-2">
          <BarChart3 className="w-3.5 h-3.5" />
          Relatório Consolidado
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Visão Geral da Sessão
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ranking.length} lojas · {rounds.length} rodada(s) · Classificação por %EBITDA médio
        </p>
      </div>

      {/* Ranking summary */}
      {ranking.length > 0 && (
        <Card className="rounded-xl shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[hsl(45_93%_47%)]" />
              Classificação Final
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="space-y-2">
              {ranking.map((r) => {
                const colors = RANK_COLORS[r.rank] ?? RANK_COLORS[4];
                return (
                  <div key={r.storeId} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${colors.bg}`}>
                    <span className={`font-mono font-bold text-sm w-6 shrink-0 ${colors.text}`}>{colors.label}</span>
                    <span className="font-display font-semibold text-sm flex-1">{r.storeName}</span>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className={r.avgEbitdaPercentage >= 0 ? 'text-accent font-bold' : 'text-destructive font-bold'}>
                        {fmtPct(r.avgEbitdaPercentage)} EBITDA médio
                      </span>
                      <span className="text-muted-foreground">{formatBrl(r.totalEbitda)} total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-store per-round breakdown */}
      {sortedStores.map((store) => {
        const rank = rankMap.get(store.storeId) ?? 4;
        const colors = RANK_COLORS[rank] ?? RANK_COLORS[4];
        return (
          <Card key={store.storeId} className="rounded-xl shadow-sm border overflow-hidden">
            <CardHeader className={`pb-3 ${colors.bg}`}>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <span className={`font-mono font-bold text-sm ${colors.text}`}>{colors.label}</span>
                  {store.storeName}
                </CardTitle>
                <div className="flex gap-2">
                  {store.rounds.map((r) => (
                    <Badge
                      key={r.round}
                      variant="outline"
                      className={r.ebitdaPercentage >= 0
                        ? 'bg-accent/10 text-accent border-accent/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'}
                    >
                      R{r.round}: {fmtPct(r.ebitdaPercentage)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 overflow-x-auto">
              {store.rounds.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum resultado disponível.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Métrica</th>
                      {store.rounds.map((r) => (
                        <th key={r.round} className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Rodada {r.round}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRIC_ROWS.map((metric) => (
                      <tr key={metric.key} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-2 pr-4 text-muted-foreground text-xs">{metric.label}</td>
                        {store.rounds.map((r) => {
                          const val = r[metric.key] as number;
                          const isEbitda = metric.key === 'ebitda' || metric.key === 'ebitdaPercentage';
                          const colorClass = isEbitda
                            ? val >= 0 ? 'text-accent font-bold' : 'text-destructive font-bold'
                            : metric.invert && val > 0
                              ? 'text-foreground'
                              : 'text-foreground';
                          return (
                            <td key={r.round} className={`text-right py-2 px-3 font-mono text-xs tabular-nums ${colorClass}`}>
                              {metric.format(val)}
                              {isEbitda && val >= 0
                                ? <TrendingUp className="inline ml-1 h-3 w-3 text-accent" />
                                : isEbitda
                                  ? <TrendingDown className="inline ml-1 h-3 w-3 text-destructive" />
                                  : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-muted/30">
                      <td className="py-2 pr-4 text-xs font-semibold text-foreground">Caixa Final</td>
                      {store.rounds.map((r) => (
                        <td key={r.round} className="text-right py-2 px-3 font-mono text-xs tabular-nums font-bold text-foreground">
                          {formatBrl(r.cashFinal)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              )}
              {/* Link to events for this session */}
              <div className="mt-3 flex gap-2 flex-wrap">
                {rounds.map((round) => (
                  <Button
                    key={round}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(`/session/${sessionId}/rounds/${round}/events`)}
                  >
                    Eventos R{round}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
