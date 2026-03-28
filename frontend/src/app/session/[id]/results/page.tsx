'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoundResultEntry {
  round: number;
  csat: number;
  availability: number;
  basketPrice: number;
  rankScore: number;
  demandShare: number;
  grossRevenue: number;
  taxAmount: number;
  netRevenue: number;
  costOfGoods: number;
  breakageAmount: number;
  agingAmount: number;
  payrollCost: number;
  maintenanceCost: number;
  licenseCost: number;
  interestCost: number;
  slaRevenueLost: number;
  ebitda: number;
  ebitdaPercentage: number;
  cashUsed: number;
  cashFinal: number;
}

interface StoreResultEntry {
  storeId: string;
  storeName: string;
  initialCash: number;
  rounds: RoundResultEntry[];
}

interface RankingEntry {
  rank: number;
  storeId: string;
  storeName: string;
  avgEbitdaPercentage: number;
  totalEbitda: number;
  rounds: { round: number; ebitda: number; ebitdaPercentage: number; cashFinal: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBrl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const RANK_COLORS: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-slate-100 text-slate-700',
  3: 'bg-orange-100 text-orange-700',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { user } = useAuthStore();

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [storeResults, setStoreResults] = useState<StoreResultEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const { on } = useSocket(sessionId);

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [rankData, resultsData] = await Promise.all([
          api.get<RankingEntry[]>(`/results/${sessionId}/ranking`),
          api.get<StoreResultEntry[]>(`/results/${sessionId}`),
        ]);
        setRanking(rankData);
        setStoreResults(resultsData);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Erro ao carregar resultados');
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [sessionId, user]);

  // ── Socket: live updates when new round results arrive ────────────────────────

  useEffect(() => {
    return on<{ results: RoundResultEntry[] }>('round:results', () => {
      // Reload results when new round finishes
      Promise.all([
        api.get<RankingEntry[]>(`/results/${sessionId}/ranking`),
        api.get<StoreResultEntry[]>(`/results/${sessionId}`),
      ]).then(([rankData, resultsData]) => {
        setRanking(rankData);
        setStoreResults(resultsData);
      });
    });
  }, [on, sessionId]);

  useEffect(() => {
    return on<unknown>('session:finished', () => {
      Promise.all([
        api.get<RankingEntry[]>(`/results/${sessionId}/ranking`),
        api.get<StoreResultEntry[]>(`/results/${sessionId}`),
      ]).then(([rankData, resultsData]) => {
        setRanking(rankData);
        setStoreResults(resultsData);
      });
    });
  }, [on, sessionId]);

  function toggleExpanded(storeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(storeId) ? next.delete(storeId) : next.add(storeId);
      return next;
    });
  }

  // ── States ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        Carregando resultados...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-display font-bold">Resultados da Sessão</h1>
        {/* Ranking table */}
        <section>
          <h2 className="text-xl font-bold mb-4">Ranking Final</h2>
          {ranking.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum resultado disponível ainda.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-4 py-3 w-12">#</th>
                      <th className="px-4 py-3">Loja</th>
                      {Array.from({ length: Math.max(...ranking.map((r) => r.rounds.length), 0) }, (_, i) => (
                        <th key={i} className="px-4 py-3 text-right">
                          R{i + 1} EBITDA%
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right">Média %</th>
                      <th className="px-4 py-3 text-right">Total EBITDA</th>
                      <th className="px-4 py-3 text-right">Caixa Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((entry) => {
                      const maxRounds = Math.max(...ranking.map((r) => r.rounds.length), 0);
                      const lastRound = entry.rounds[entry.rounds.length - 1];
                      return (
                        <tr key={entry.storeId} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                RANK_COLORS[entry.rank] ?? 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {entry.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{entry.storeName}</td>
                          {Array.from({ length: maxRounds }, (_, i) => {
                            const r = entry.rounds.find((rr) => rr.round === i + 1);
                            return (
                              <td key={i} className="px-4 py-3 text-right tabular-nums">
                                {r ? (
                                  <span className={r.ebitdaPercentage < 0 ? 'text-destructive' : ''}>
                                    {fmtPct(r.ebitdaPercentage)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            <span className={entry.avgEbitdaPercentage < 0 ? 'text-destructive' : 'text-green-700'}>
                              {fmtPct(entry.avgEbitdaPercentage)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {fmtBrl(entry.totalEbitda)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {lastRound ? (
                              <span className={lastRound.cashFinal < 0 ? 'text-destructive' : 'text-blue-700'}>
                                {fmtBrl(lastRound.cashFinal)}
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
              </CardContent>
            </Card>
          )}
        </section>

        {/* Breakdown per store */}
        <section>
          <h2 className="text-xl font-bold mb-4">Breakdown por Loja</h2>
          <div className="space-y-4">
            {storeResults.map((store) => (
              <Card key={store.storeId}>
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleExpanded(store.storeId)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{store.storeName}</CardTitle>
                    <div className="flex items-center gap-2">
                      {store.rounds.map((r) => (
                        <Badge key={r.round} variant={r.ebitdaPercentage >= 0 ? 'success' : 'destructive'}>
                          R{r.round}: {fmtPct(r.ebitdaPercentage)}
                        </Badge>
                      ))}
                      <span className="text-muted-foreground text-sm ml-2">
                        {expanded.has(store.storeId) ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {expanded.has(store.storeId) && (
                  <CardContent className="pt-0 space-y-4">
                    {store.rounds.map((r) => (
                      <RoundBreakdown key={r.round} round={r} initialCash={store.initialCash} />
                    ))}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoundBreakdown({
  round,
  initialCash,
}: {
  round: RoundResultEntry;
  initialCash: number;
}) {
  const fmt0 = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const plRows: { label: string; value: string; negative?: boolean; subtotal?: boolean }[] = [
    { label: 'Receita bruta', value: fmt0(round.grossRevenue) },
    { label: 'Impostos', value: fmt0(round.taxAmount), negative: true },
    { label: 'Receita líquida', value: fmt0(round.netRevenue), subtotal: true },
    { label: 'Custo de mercadoria', value: fmt0(round.costOfGoods), negative: true },
    { label: 'Quebras', value: fmt0(round.breakageAmount), negative: true },
    { label: 'Aging', value: fmt0(round.agingAmount), negative: true },
    { label: 'Folha de pagamento', value: fmt0(round.payrollCost), negative: true },
    { label: 'Manutenção', value: fmt0(round.maintenanceCost), negative: true },
    { label: 'Licenças', value: fmt0(round.licenseCost), negative: true },
    { label: 'Juros', value: fmt0(round.interestCost), negative: true },
    { label: 'Perda SLA', value: fmt0(round.slaRevenueLost), negative: true },
    { label: 'EBITDA', value: `${fmt0(round.ebitda)} (${fmtPct(round.ebitdaPercentage)})` },
  ];

  const metrics: { label: string; value: string }[] = [
    { label: 'CSAT', value: fmtNum(round.csat) },
    { label: 'Disponibilidade', value: fmtNum(round.availability) },
    { label: 'Preço médio', value: fmtNum(round.basketPrice) },
    { label: 'Score ranking', value: String(round.rankScore) },
    { label: 'Market share', value: fmtPct(round.demandShare) },
    { label: 'Caixa usado', value: fmt0(round.cashUsed) },
  ];

  // Cash-flow composition: initialCash − cashUsed + grossRevenue − totalCosts = cashFinal
  // totalCosts derived = grossRevenue − ebitda
  const totalCosts = round.grossRevenue - round.ebitda;
  const cashFlowRows: { label: string; value: string; sign: '+' | '-' | '='; highlight?: boolean }[] = [
    { label: 'Caixa inicial', value: fmt0(initialCash), sign: '+' },
    { label: 'Estoque + CAPEX (gasto)', value: fmt0(round.cashUsed), sign: '-' },
    { label: 'Receita de vendas', value: fmt0(round.grossRevenue), sign: '+' },
    { label: 'Custos operacionais', value: fmt0(totalCosts), sign: '-' },
    { label: 'Caixa Final', value: fmt0(round.cashFinal), sign: '=', highlight: true },
  ];

  return (
    <div className="border rounded-md p-4 space-y-4">
      <h4 className="font-semibold text-sm">Rodada {round.round}</h4>

      {/* Metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-muted-foreground">{m.label}</p>
            <p className="font-medium">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P&L */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Resultado (DRE)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {plRows.map((row) => (
                  <tr key={row.label} className={`border-b last:border-0 ${row.subtotal ? 'bg-muted/20' : ''}`}>
                    <td className="py-1.5 text-muted-foreground">{row.label}</td>
                    <td
                      className={`py-1.5 text-right font-medium tabular-nums ${
                        row.label === 'EBITDA'
                          ? round.ebitdaPercentage >= 0
                            ? 'text-green-700'
                            : 'text-destructive'
                          : row.negative
                            ? 'text-destructive'
                            : ''
                      }`}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash Flow */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Caixa Final
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {cashFlowRows.map((row, idx) => (
                  <tr
                    key={row.label}
                    className={`${idx === cashFlowRows.length - 1 ? 'border-t-2 border-foreground/20' : 'border-b'} ${
                      row.highlight ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <td className={`py-1.5 ${row.highlight ? 'font-semibold' : 'text-muted-foreground'}`}>
                      <span
                        className={`mr-1.5 text-xs font-bold ${
                          row.sign === '+' ? 'text-green-600' : row.sign === '-' ? 'text-destructive' : 'text-blue-700'
                        }`}
                      >
                        {row.sign}
                      </span>
                      {row.label}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        row.highlight
                          ? round.cashFinal >= 0
                            ? 'font-bold text-blue-700'
                            : 'font-bold text-destructive'
                          : row.sign === '-'
                            ? 'text-destructive'
                            : ''
                      }`}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
