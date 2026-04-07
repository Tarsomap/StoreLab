'use client';

/**
 * Fluxo do facilitador — Dashboard (`/dashboard`):
 * 1) Ao abrir, GET `/sessions` lista todas as partidas dele; enquanto carrega mostra esqueleto.
 * 2) Pode criar sessão (POST `/sessions`) — nome, demanda, caixa; nova sessão aparece no topo da lista.
 * 3) Vê KPIs, destaque da primeira sessão ativa, grade de sessões ativas (clique vai para `/dashboard/session/[id]`).
 * 4) Sessões finalizadas alimentam gráfico de EBITDA % (GET `/results/:id/ranking`) e tabela “Histórico” com link para resultados públicos.
 */
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatBrl } from '@/lib/format-brl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, LayoutDashboard, History, Play, Store, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import {
  SessionStatusBadge,
  SESSION_STATUS_LABEL,
} from '@/components/session-status-badge';

// ── Types ────────────────────────────────────────────────────────────────────

/** Campos opcionais caso a API evolua sem mudar o fetch desta página. */
interface Session {
  id: string;
  name: string;
  status: string;
  totalDemand: number;
  initialCash: number;
  disponibilidade?: number[];
  createdAt: string;
  storeCount?: number;
  /** POs confirmados na sessão, se a API enviar. */
  confirmedPos?: number;
  stores?: unknown[];
  winnerStoreName?: string;
  winningStoreName?: string;
  firstPlaceStoreName?: string;
  winner?: { storeName?: string; name?: string };
}

interface CategoryCatalogEntry {
  id: string;
  name: 'PERECIVEIS' | 'MERCEARIA' | 'ELETRO' | 'HIPEL';
  stockAvailable: number;
  unitCost: number;
  taxRate: number;
}

const STATUS_PROGRESS: Record<string, string> = {
  SETUP: 'Configuração',
  ROUND_1_CONFIG: 'Configuração R.1',
  ROUND_1: 'Rodada 1 de 3',
  RECONFIGURATION: 'Reconfiguração',
  ROUND_2: 'Rodada 2 de 3',
  ROUND_3: 'Rodada 3 de 3',
  FINISHED: 'Finalizada',
};

/** Extrai nome da loja campeã de vários formatos possíveis da API (compatibilidade). */
function formatSessionWinner(session: Session): string {
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

/** Número de lojas na sessão a partir de `storeCount` ou tamanho do array `stores`. */
function formatStoreCount(session: Session): string {
  if (typeof session.storeCount === 'number' && Number.isFinite(session.storeCount)) {
    return String(session.storeCount);
  }
  if (Array.isArray(session.stores)) {
    return String(session.stores.length);
  }
  return '—';
}

/** Soma lojas só se todas as sessões finalizadas tiverem `storeCount` — senão mostra traço no KPI. */
function sumTrainedStoresForFinished(finished: Session[]): number | '—' {
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

/** Texto “confirmados/total” para o cartão em destaque quando a API enviar os dois números. */
function formatConfirmedStores(session: Session): string {
  const c = session.confirmedPos;
  const sc = session.storeCount;
  const hasC = typeof c === 'number' && Number.isFinite(c);
  const hasSc = typeof sc === 'number' && Number.isFinite(sc);
  if (hasC && hasSc) return `${c}/${sc}`;
  return '—/—';
}

// ── Desempenho histórico (ranking / gráfico) ─────────────────────────────────

interface RankingEntry {
  rank: number;
  storeId: string;
  storeName: string;
  avgEbitdaPercentage: number;
  totalEbitda: number;
  rounds: { round: number; ebitda: number; ebitdaPercentage: number; cashFinal: number }[];
}

const ROUNDS_AXIS = [1, 2, 3] as const;

/** Cores por loja — alinhadas às categorias do design system (CLAUDE.md). */
const STORE_LINE_COLORS = [
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(217 91% 60%)',
  'hsl(280 68% 60%)',
];

type EbitdaChartRow = { round: number } & Record<string, number | null>;

/** Monta linhas do gráfico: eixo X = rodada 1–3, uma série por `storeId` com EBITDA % daquela rodada. */
function buildEbitdaChartRows(ranking: RankingEntry[]): EbitdaChartRow[] {
  return ROUNDS_AXIS.map((round) => {
    const row: EbitdaChartRow = { round };
    for (const entry of ranking) {
      const hit = entry.rounds.find((x) => x.round === round);
      row[entry.storeId] = hit != null ? hit.ebitdaPercentage : null;
    }
    return row;
  });
}

/** Evita gráfico vazio se o ranking não tiver séries por rodada. */
function rankingHasRoundData(ranking: RankingEntry[]): boolean {
  return ranking.some((e) => e.rounds.length > 0);
}

/** Caixa flutuante do gráfico Recharts listando cada loja e o % de EBITDA na rodada sob o cursor. */
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

/**
 * Bloco “Desempenho histórico”: seletor de sessão finalizada + GET ranking + gráfico de linhas.
 * **API:** ao mudar sessão, busca `/results/:id/ranking`; **tela:** mostra loading, erro ou gráfico.
 */
function HistoricPerformanceSection({ finishedSessions }: { finishedSessions: Session[] }) {
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
      .then((data) => {
        if (!cancelled) setRanking(data);
      })
      .catch(() => {
        if (!cancelled) {
          setRankingError(true);
          setRanking(null);
        }
      })
      .finally(() => {
        if (!cancelled) setRankingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSessionId]);

  const chartData = useMemo(() => {
    if (!ranking) return [];
    return buildEbitdaChartRows(ranking);
  }, [ranking]);

  const showSessionSelect = finishedSessions.length >= 1;
  const showChart =
    !rankingLoading &&
    !rankingError &&
    ranking !== null &&
    rankingHasRoundData(ranking);

  return (
    <section className="space-y-4" aria-labelledby="historic-performance-heading">
      <h3
        id="historic-performance-heading"
        className="font-display text-xl font-bold text-foreground"
      >
        Desempenho Histórico
      </h3>
      <Card className="rounded-xl border shadow-sm transition-colors duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base font-semibold text-foreground">
            EBITDA % por rodada
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Comparativo das lojas nas rodadas 1 a 3 da sessão selecionada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSessionSelect && selectedSessionId && (
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
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {rankingLoading && (
            <div
              className="h-48 w-full animate-pulse rounded-xl bg-muted"
              aria-hidden
            />
          )}

          {rankingError && (
            <p className="text-sm text-destructive">Não foi possível carregar os dados.</p>
          )}

          {!rankingLoading &&
            !rankingError &&
            ranking !== null &&
            !rankingHasRoundData(ranking) && (
              <p className="text-sm text-muted-foreground">
                Nenhum resultado disponível para esta sessão.
              </p>
            )}

          {showChart && ranking && (
            <div className="h-72 w-full min-h-[288px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
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
                    formatter={(value) => (
                      <span className="text-sm text-foreground">{value}</span>
                    )}
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

// ── Page ─────────────────────────────────────────────────────────────────────

/** Página principal do facilitador após login — lista, cria e resume sessões. */
export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDemand, setNewDemand] = useState('1000');
  const [newCash, setNewCash] = useState('700000');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [categoryCatalog, setCategoryCatalog] = useState<CategoryCatalogEntry[]>([]);
  const [categoryStocks, setCategoryStocks] = useState<Record<string, string>>({});

  const { activeSessions, finishedSessions, kpi, featuredSession } = useMemo(() => {
    const active = sessions.filter((s) => s.status !== 'FINISHED');
    const finished = sessions
      .filter((s) => s.status === 'FINISHED')
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    const total = sessions.length;
    const finishedCount = finished.length;
    const trainedStores = sumTrainedStoresForFinished(finished);
    const completionPct =
      total === 0 ? 0 : Math.round((finishedCount / total) * 100);
    return {
      activeSessions: active,
      finishedSessions: finished,
      kpi: {
        total,
        activeCount: active.length,
        trainedStores,
        completionPct,
      },
      featuredSession: active.length > 0 ? active[0] : null,
    };
  }, [sessions]);

  useEffect(() => {
    api
      .get<Session[]>('/sessions')
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api
      .get<CategoryCatalogEntry[]>('/sessions/catalog/categories')
      .then((catalog) => {
        setCategoryCatalog(catalog);
        setCategoryStocks(
          Object.fromEntries(catalog.map((category) => [category.id, String(category.stockAvailable)])),
        );
      })
      .catch(() => {
        setCategoryCatalog([]);
      });
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const session = await api.post<Session>('/sessions', {
        name: newName.trim(),
        totalDemand: Number(newDemand),
        initialCash: Number(newCash),
        categoryConfigs: categoryCatalog.map((category) => ({
          categoryId: category.id,
          stockAvailable: Number(categoryStocks[category.id] ?? category.stockAvailable),
        })),
      });
      toast.success('Sessão criada');
      setSessions((prev) => [session, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDemand('1000');
      setNewCash('700000');
      setCategoryStocks(
        Object.fromEntries(
          categoryCatalog.map((category) => [category.id, String(category.stockAvailable)]),
        ),
      );
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar sessão');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Minhas Sessões</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as sessões de jogo
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? (
            'Cancelar'
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Nova sessão
            </>
          )}
        </Button>
      </div>

      {showCreate && (
        <Card className="shadow-sm border">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold font-display">Nova sessão</CardTitle>
          </CardHeader>
          <Separator className="my-4" />
          <form onSubmit={handleCreate}>
            <CardContent className="space-y-4 pt-0">
              {createError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                  {createError}
                </p>
              )}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1 space-y-2">
                  <Label htmlFor="new-name" className="text-sm text-muted-foreground">
                    Nome da sessão
                  </Label>
                  <Input
                    id="new-name"
                    placeholder="Ex: Turma A"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-demand" className="text-sm text-muted-foreground">
                    Demanda total
                  </Label>
                  <Input
                    id="new-demand"
                    type="number"
                    min={1}
                    required
                    value={newDemand}
                    onChange={(e) => setNewDemand(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-cash" className="text-sm text-muted-foreground">
                    Caixa inicial (R$)
                  </Label>
                  <Input
                    id="new-cash"
                    type="number"
                    min={1}
                    required
                    value={newCash}
                    onChange={(e) => setNewCash(e.target.value)}
                  />
                </div>
              </div>

              {categoryCatalog.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Disponibilidade por categoria</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {categoryCatalog.map((category) => (
                      <div key={category.id} className="space-y-2">
                        <Label htmlFor={`stock-${category.id}`} className="text-sm text-muted-foreground">
                          {category.name}
                        </Label>
                        <Input
                          id={`stock-${category.id}`}
                          type="number"
                          min={0}
                          value={categoryStocks[category.id] ?? ''}
                          onChange={(e) =>
                            setCategoryStocks((prev) => ({
                              ...prev,
                              [category.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <div className="px-6 pb-6">
              <Button type="submit" disabled={creating}>
                {creating ? 'Criando...' : 'Criar sessão'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
        aria-label="Indicadores do dashboard"
      >
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors duration-200">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total de sessões
            </span>
            <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-foreground tabular-nums">
            {kpi.total}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors duration-200">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sessões ativas
            </span>
            <Play className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-foreground tabular-nums">
            {kpi.activeCount}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors duration-200">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Lojas treinadas
            </span>
            <Store className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-foreground tabular-nums">
            {kpi.trainedStores}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors duration-200">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Taxa de conclusão
            </span>
            <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-foreground tabular-nums">
            {kpi.completionPct}%
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card className="shadow-sm border">
          <CardContent className="py-16 px-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <LayoutDashboard className="h-7 w-7" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-display text-base font-semibold text-foreground">
                Nenhuma sessão criada ainda
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Crie a primeira sessão para convidar lojas e acompanhar as rodadas do jogo.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova sessão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {featuredSession && (
            <Card className="shadow-sm border rounded-xl transition-colors duration-200 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="font-display text-lg font-semibold text-foreground">
                        {featuredSession.name}
                      </CardTitle>
                      <SessionStatusBadge status={featuredSession.status} />
                    </div>
                    <CardDescription className="text-sm text-muted-foreground">
                      Sessão em destaque
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    className="w-full shrink-0 sm:w-auto rounded-xl"
                    onClick={() => router.push(`/dashboard/session/${featuredSession.id}`)}
                  >
                    Acompanhar sessão →
                  </Button>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="flex flex-col gap-3 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Rodada atual
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {STATUS_PROGRESS[featuredSession.status] ??
                      SESSION_STATUS_LABEL[featuredSession.status] ??
                      featuredSession.status}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Lojas confirmadas
                  </p>
                  <p className="mt-1 font-mono font-medium text-foreground">
                    {formatConfirmedStores(featuredSession)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <section className="space-y-4" aria-labelledby="active-sessions-heading">
            <h3
              id="active-sessions-heading"
              className="font-display text-xl font-bold text-foreground"
            >
              Sessões Ativas
            </h3>
            {activeSessions.length === 0 ? (
              <Card className="shadow-sm border transition-colors duration-200 hover:shadow-md">
                <CardContent className="py-16 px-6 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <LayoutDashboard className="h-7 w-7" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-base font-semibold text-foreground">
                      Nenhuma sessão ativa
                    </p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Não há sessões em andamento. Crie uma nova ou consulte o histórico abaixo.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova sessão
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeSessions.map((s) => (
                  <Card
                    key={s.id}
                    className="cursor-pointer shadow-sm border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                    onClick={() => router.push(`/dashboard/session/${s.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="font-display font-semibold text-base leading-tight">
                          {s.name}
                        </CardTitle>
                        <SessionStatusBadge status={s.status} />
                      </div>
                      <CardDescription className="mt-1 text-sm text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="text-sm text-muted-foreground space-y-1 pt-4">
                      <p>
                        Demanda:{' '}
                        <span className="font-mono font-medium text-foreground">
                          {s.totalDemand.toLocaleString('pt-BR')}
                        </span>
                      </p>
                      <p>
                        Caixa:{' '}
                        <span className="font-mono font-medium text-foreground">
                          {formatBrl(s.initialCash)}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {finishedSessions.length > 0 && (
            <HistoricPerformanceSection finishedSessions={finishedSessions} />
          )}

          <section className="space-y-4" aria-labelledby="history-heading">
            <h3 id="history-heading" className="font-display text-xl font-bold text-foreground">
              Histórico
            </h3>
            {finishedSessions.length === 0 ? (
              <Card className="shadow-sm border rounded-xl transition-colors duration-200">
                <CardContent className="py-14 px-6 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <History className="h-6 w-6" aria-hidden />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma sessão finalizada ainda</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm border rounded-xl transition-colors duration-200 hover:shadow-md">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-display text-foreground">Nome da sessão</TableHead>
                        <TableHead className="font-display text-foreground">Data</TableHead>
                        <TableHead className="font-display text-foreground text-right">
                          Nº de lojas
                        </TableHead>
                        <TableHead className="font-display text-foreground">Vencedor</TableHead>
                        <TableHead className="font-display text-foreground text-right w-[140px]">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finishedSessions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-foreground">
                            {formatStoreCount(s)}
                          </TableCell>
                          <TableCell className="text-foreground">{formatSessionWinner(s)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-md"
                              onClick={() => router.push(`/session/${s.id}/results`)}
                            >
                              Ver resultados
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
