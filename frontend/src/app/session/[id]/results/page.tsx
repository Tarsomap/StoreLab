'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { formatBrl } from '@/lib/format-brl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Trophy, Award, Medal, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, ChevronLeft,
} from 'lucide-react';
import { ResultsSkeleton } from '@/components/skeletons/results-skeleton';

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

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const ebitdaClass = (pct: number) => (pct >= 0 ? 'text-accent' : 'text-destructive');

// ── Rank inline styles (safe, no JIT issues) ─────────────────────────────────

function rankHeaderStyle(rank: number): React.CSSProperties {
  switch (rank) {
    case 1: return { background: 'linear-gradient(135deg, hsl(45,93%,52%) 0%, hsl(38,92%,44%) 100%)' };
    case 2: return { background: 'linear-gradient(135deg, hsl(210,11%,80%) 0%, hsl(210,11%,62%) 100%)' };
    case 3: return { background: 'linear-gradient(135deg, hsl(29,55%,58%) 0%, hsl(29,49%,44%) 100%)' };
    default: return { background: 'linear-gradient(135deg, hsl(220,9%,72%) 0%, hsl(220,9%,58%) 100%)' };
  }
}

function rankGlowStyle(rank: number): React.CSSProperties {
  switch (rank) {
    case 1: return { boxShadow: '0 0 52px hsla(45,93%,47%,0.32), 0 8px 28px rgba(0,0,0,0.12)' };
    case 2: return { boxShadow: '0 4px 20px rgba(0,0,0,0.09)' };
    case 3: return { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' };
    default: return { boxShadow: '0 2px 10px rgba(0,0,0,0.06)' };
  }
}

function rankBadgeStyle(rank: number): React.CSSProperties {
  switch (rank) {
    case 1: return {
      background: 'linear-gradient(135deg, hsl(45,93%,52%), hsl(38,92%,44%))',
      color: 'hsl(45,80%,18%)',
    };
    case 2: return {
      background: 'linear-gradient(135deg, hsl(210,11%,72%), hsl(210,11%,58%))',
      color: 'hsl(210,11%,18%)',
    };
    case 3: return {
      background: 'linear-gradient(135deg, hsl(29,55%,56%), hsl(29,49%,43%))',
      color: 'hsl(29,49%,16%)',
    };
    default: return { background: 'hsl(220,9%,62%)', color: 'white' };
  }
}

function rankHeaderTextStyle(rank: number): React.CSSProperties {
  switch (rank) {
    case 1: return { color: 'hsl(45,80%,18%)' };
    case 2: return { color: 'hsl(210,11%,20%)' };
    case 3: return { color: 'hsl(29,49%,16%)' };
    default: return { color: 'white' };
  }
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '' };
const RANK_LABEL: Record<number, string> = {
  1: '1º Lugar', 2: '2º Lugar', 3: '3º Lugar', 4: '4º Lugar',
};

// ── PodiumCard ────────────────────────────────────────────────────────────────

function PodiumCard({
  entry,
  podiumBaseStrip = false,
}: {
  entry: RankingEntry;
  podiumBaseStrip?: boolean;
}) {
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
        className="px-5 py-3.5 flex items-center justify-between"
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

        {/* EBITDA médio — hero number */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">EBITDA Médio</p>
          <p
            className={`font-mono font-bold leading-none ${ebitdaClass(entry.avgEbitdaPercentage)} ${
              isChampion ? 'text-5xl' : 'text-3xl'
            }`}
          >
            {fmtPct(entry.avgEbitdaPercentage)}
          </p>
        </div>

        {/* Per-round progress bars */}
        <div className="space-y-2">
          {entry.rounds.map((r) => {
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
              </div>
            );
          })}
        </div>

        {/* Cash final */}
        {lastRound && (
          <div className="pt-3 border-t border-border/40">
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

      {podiumBaseStrip && (
        <div className="h-3 shrink-0" style={rankHeaderStyle(entry.rank)} aria-hidden />
      )}
    </div>
    </div>
  );
}

// ── RankingTable ──────────────────────────────────────────────────────────────

function RankingTable({ ranking }: { ranking: RankingEntry[] }) {
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

// ── StoreBreakdownCard ────────────────────────────────────────────────────────

function StoreBreakdownCard({
  store,
  rank,
  isExpanded,
  onToggle,
}: {
  store: StoreResultEntry;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
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

// ── RoundBreakdown ────────────────────────────────────────────────────────────

function RoundBreakdown({
  round,
  initialCash,
}: {
  round: RoundResultEntry;
  initialCash: number;
}) {
  const plRows: {
    label: string;
    value: string;
    negative?: boolean;
    subtotal?: boolean;
    isEbitda?: boolean;
  }[] = [
    { label: 'Receita bruta', value: formatBrl(round.grossRevenue) },
    { label: 'Impostos', value: formatBrl(round.taxAmount), negative: true },
    { label: 'Receita líquida', value: formatBrl(round.netRevenue), subtotal: true },
    { label: 'Custo de mercadoria', value: formatBrl(round.costOfGoods), negative: true },
    { label: 'Quebras', value: formatBrl(round.breakageAmount), negative: true },
    { label: 'Aging', value: formatBrl(round.agingAmount), negative: true },
    { label: 'Folha de pagamento', value: formatBrl(round.payrollCost), negative: true },
    { label: 'Manutenção', value: formatBrl(round.maintenanceCost), negative: true },
    { label: 'Licenças', value: formatBrl(round.licenseCost), negative: true },
    { label: 'Juros', value: formatBrl(round.interestCost), negative: true },
    { label: 'Perda SLA', value: formatBrl(round.slaRevenueLost), negative: true },
    {
      label: 'EBITDA',
      value: `${formatBrl(round.ebitda)} (${fmtPct(round.ebitdaPercentage)})`,
      isEbitda: true,
    },
  ];

  const metrics: { label: string; value: string }[] = [
    { label: 'CSAT', value: fmtNum(round.csat) },
    { label: 'Disponibilidade', value: fmtNum(round.availability) },
    { label: 'Preço médio', value: fmtNum(round.basketPrice) },
    { label: 'Score ranking', value: String(round.rankScore) },
    { label: 'Market share', value: fmtPct(round.demandShare) },
    { label: 'Caixa usado', value: formatBrl(round.cashUsed) },
  ];

  const totalCosts = round.grossRevenue - round.ebitda;
  const cashFlowRows: {
    label: string;
    value: string;
    sign: '+' | '-' | '=';
    highlight?: boolean;
  }[] = [
    { label: 'Caixa inicial', value: formatBrl(initialCash), sign: '+' },
    { label: 'Estoque + CAPEX (gasto)', value: formatBrl(round.cashUsed), sign: '-' },
    { label: 'Receita de vendas', value: formatBrl(round.grossRevenue), sign: '+' },
    { label: 'Custos operacionais', value: formatBrl(totalCosts), sign: '-' },
    { label: 'Caixa Final', value: formatBrl(round.cashFinal), sign: '=', highlight: true },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
      {/* Round header */}
      <div className="flex items-center gap-2">
        <h4 className="font-display font-bold text-sm text-foreground">
          Rodada {round.round}
        </h4>
        <span
          className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
            round.ebitdaPercentage >= 0
              ? 'bg-accent/10 text-accent'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {fmtPct(round.ebitdaPercentage)}
        </span>
        {round.ebitdaPercentage >= 0 ? (
          <TrendingUp className="w-3.5 h-3.5 text-accent" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="bg-muted/40 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">{m.label}</p>
            <p className="font-mono text-sm font-semibold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P&L */}
        <div className="rounded-lg bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Resultado (DRE)
          </p>
          <div>
            {plRows.map((row) => (
              <div
                key={row.label}
                className={`flex justify-between items-center py-1.5 border-b border-border/30 last:border-0 ${
                  row.subtotal ? '-mx-3 px-3 bg-muted/30' : ''
                } ${row.isEbitda ? 'border-t border-border/60 mt-1 pt-2' : ''}`}
              >
                <span
                  className={`text-xs ${
                    row.subtotal || row.isEbitda ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {row.label}
                </span>
                <span
                  className={`font-mono text-xs font-medium ${
                    row.isEbitda
                      ? round.ebitdaPercentage >= 0
                        ? 'text-accent font-bold'
                        : 'text-destructive font-bold'
                      : row.negative
                        ? 'text-destructive/80'
                        : 'text-foreground'
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Flow */}
        <div className="rounded-lg bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Caixa Final
          </p>
          <div>
            {cashFlowRows.map((row, idx) => (
              <div
                key={row.label}
                className={`flex justify-between items-center py-1.5 ${
                  idx === cashFlowRows.length - 1
                    ? 'border-t-2 border-foreground/15 mt-1 pt-2'
                    : 'border-b border-border/30'
                } ${row.highlight ? '-mx-3 px-3 bg-primary/5 rounded' : ''}`}
              >
                <span
                  className={`text-xs flex items-center gap-1.5 ${
                    row.highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    className={`font-mono font-bold ${
                      row.sign === '+'
                        ? 'text-accent'
                        : row.sign === '-'
                          ? 'text-destructive'
                          : 'text-primary'
                    }`}
                  >
                    {row.sign}
                  </span>
                  {row.label}
                </span>
                <span
                  className={`font-mono text-xs ${
                    row.highlight
                      ? round.cashFinal >= 0
                        ? 'font-bold text-primary'
                        : 'font-bold text-destructive'
                      : row.sign === '-'
                        ? 'text-destructive/80 font-medium'
                        : 'text-foreground/80'
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Facilitator back nav ───────────────────────────────────────────────────────

function FacilitatorResultsBackNav({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  return (
    <div className="-mt-1 mb-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(`/dashboard/session/${sessionId}`)}
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        Voltar para a Sessão
      </Button>
    </div>
  );
}

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

  // ── Load ──────────────────────────────────────────────────────────────────────

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
      <div className="max-w-5xl mx-auto pb-16">
        {user?.role === 'FACILITATOR' && <FacilitatorResultsBackNav sessionId={sessionId} />}
        <ResultsSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto">
        {user?.role === 'FACILITATOR' && <FacilitatorResultsBackNav sessionId={sessionId} />}
        <div className="flex items-center justify-center py-32">
          <p className="text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────────

  const storeRankMap: Record<string, number> = {};
  ranking.forEach((e) => {
    storeRankMap[e.storeId] = e.rank;
  });

  const sortedStoreResults = [...storeResults].sort(
    (a, b) => (storeRankMap[a.storeId] ?? 99) - (storeRankMap[b.storeId] ?? 99),
  );

  const winner = ranking.find((r) => r.rank === 1);

  // Podium arrangement: 2nd | 1st (elevated) | 3rd
  const podiumTop = [
    ranking.find((r) => r.rank === 2),
    ranking.find((r) => r.rank === 1),
    ranking.find((r) => r.rank === 3),
  ].filter((e): e is RankingEntry => e !== undefined);
  const fourthPlace = ranking.find((r) => r.rank === 4);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      {user?.role === 'FACILITATOR' && <FacilitatorResultsBackNav sessionId={sessionId} />}

      {/* ── HERO HEADER ───────────────────────────────────────────────────── */}
      <div className="space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest">
          <Trophy className="w-3.5 h-3.5" />
          Resultado Final
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Resultado da Sessão
        </h1>
        {winner ? (
          <p className="text-muted-foreground text-base">
            <span className="font-display font-semibold text-foreground">
              {winner.storeName}
            </span>{' '}
            conquistou o 1º lugar com{' '}
            <span className={`font-mono font-bold ${ebitdaClass(winner.avgEbitdaPercentage)}`}>
              {fmtPct(winner.avgEbitdaPercentage)}
            </span>{' '}
            de EBITDA médio.
          </p>
        ) : (
          <p className="text-muted-foreground text-base">
            Aguardando resultados das rodadas.
          </p>
        )}
      </div>

      {/* ── PODIUM ────────────────────────────────────────────────────────── */}
      {ranking.length > 0 && (
        <section>
          {/* 1st, 2nd, 3rd in podium layout */}
          <div className="grid grid-cols-3 gap-4 items-end">
            {podiumTop.map((entry, idx) => (
              <div
                key={entry.storeId}
                className={idx === 1 ? '-translate-y-5' : ''}
              >
                <PodiumCard entry={entry} podiumBaseStrip />
              </div>
            ))}
          </div>

          {/* 4th place below the podium */}
          {fourthPlace && (
            <div className="mt-5 max-w-xs mx-auto">
              <PodiumCard entry={fourthPlace} />
            </div>
          )}
        </section>
      )}

      {/* ── RANKING TABLE ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-foreground">
          Tabela de Classificação
        </h2>
        {ranking.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum resultado disponível ainda.
            </CardContent>
          </Card>
        ) : (
          <RankingTable ranking={ranking} />
        )}
      </section>

      {/* ── BREAKDOWN ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-foreground">
          Breakdown por Loja
        </h2>
        <div className="space-y-3">
          {sortedStoreResults.map((store) => (
            <StoreBreakdownCard
              key={store.storeId}
              store={store}
              rank={storeRankMap[store.storeId] ?? 4}
              isExpanded={expanded.has(store.storeId)}
              onToggle={() => toggleExpanded(store.storeId)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
