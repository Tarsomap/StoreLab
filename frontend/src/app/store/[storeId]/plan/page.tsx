'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { POSkeleton } from '@/components/skeletons/po-skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatBrl } from '@/lib/format-brl';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ClipboardCheck,
  Users,
  ShoppingBag,
  BookOpen,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type StoreRole =
  | 'STORE_MANAGER'
  | 'SUPPLY_MANAGER'
  | 'COMMERCIAL_MANAGER'
  | 'OPERATIONAL_MANAGER'
  | 'SERVICE_MANAGER';

interface CategoryDecisionEntry {
  id: string;
  categoryId: string;
  categoryName: string;
  unitCost: number;
  taxRate: number;
  breakageRate: number;
  agingRate: number;
  stockPurchased: number;
  priceMargin: number;
  lineCost: number;
}

interface CapexDecisionEntry {
  id: string;
  capexOptionId: string;
  capexName: string;
  acquisitionCost: number;
  implemented: boolean;
}

interface PlanFinancials {
  cashUsed: number;
  availableCash: number;
  interestCost: number;
  payrollCost: number;
  maintenanceCost: number;
  licenseCost: number;
  projectedGrossRevenue: number;
  projectedEbitda: number;
  projectedEbitdaPercentage: number;
}

interface PlanFullResponse {
  id: string;
  storeId: string;
  configVersion: number;
  cashierOperators: number;
  serviceOperators: number;
  confirmed: boolean;
  confirmedAt: string | null;
  categoryDecisions: CategoryDecisionEntry[];
  capexDecisions: CapexDecisionEntry[];
  financials: PlanFinancials;
}

interface StoreSummary {
  id: string;
  sessionId: string;
  name: string;
  accessCode: string;
}

interface StockAvailabilityEntry {
  categoryId: string;
  categoryName: string;
  totalAvailable: number;
  totalPurchased: number;
  remaining: number;
}

interface PlayerScoreResponse {
  answered: boolean;
  correctAnswers: number;
  totalQuestions: number;
  scorePercentage: number;
}

interface StoreMemberEntry {
  userId: string;
  name: string;
  role: StoreRole;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function configVersionFromStatus(status: string): number {
  if (status === 'ROUND_3') return 3;
  if (status === 'RECONFIGURATION' || status === 'ROUND_2') return 2;
  return 1;
}

const brl = formatBrl;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number) => n.toLocaleString('pt-BR');

interface CatRow extends CategoryDecisionEntry {
  sellPrice: number;
  totalVenda: number;
  impostos: number;
  totalEstoque: number;
  quebrasR: number;
  agingR: number;
}

function buildCatRows(cats: CategoryDecisionEntry[]): CatRow[] {
  return cats.map((c) => {
    const sellPrice = c.unitCost * (1 + c.priceMargin);
    const totalVenda = c.stockPurchased * sellPrice;
    const impostos = totalVenda * c.taxRate;
    const totalEstoque = c.stockPurchased * c.unitCost;
    const quebrasR = totalEstoque * c.breakageRate;
    const agingR = totalEstoque * c.agingRate;
    return { ...c, sellPrice, totalVenda, impostos, totalEstoque, quebrasR, agingR };
  });
}

interface DreLines {
  totalVendas: number;
  impostos: number;
  vendaLiquida: number;
  custoVenda: number;
  massaMgLiquida: number;
  quebras: number;
  aging: number;
  massaFinal: number;
  folha: number;
  manutencao: number;
  juros: number;
  licencas: number;
  ebitda: number;
  ebitdaPct: number;
}

function buildDre(rows: CatRow[], financials: PlanFinancials): DreLines {
  const totalVendas = rows.reduce((s, r) => s + r.totalVenda, 0);
  const impostos = rows.reduce((s, r) => s + r.impostos, 0);
  const vendaLiquida = totalVendas - impostos;
  const custoVenda = rows.reduce((s, r) => s + r.totalEstoque, 0);
  const massaMgLiquida = vendaLiquida - custoVenda;
  const quebras = rows.reduce((s, r) => s + r.quebrasR, 0);
  const aging = rows.reduce((s, r) => s + r.agingR, 0);
  const massaFinal = massaMgLiquida - quebras - aging;
  const folha = financials.payrollCost;
  const manutencao = financials.maintenanceCost;
  const juros = financials.interestCost;
  const licencas = financials.licenseCost;
  const ebitda = massaFinal - folha - manutencao - juros - licencas;
  const ebitdaPct = totalVendas > 0 ? ebitda / totalVendas : 0;
  return { totalVendas, impostos, vendaLiquida, custoVenda, massaMgLiquida, quebras, aging, massaFinal, folha, manutencao, juros, licencas, ebitda, ebitdaPct };
}

// Category color mapping
const CATEGORY_STYLE: Record<string, {
  border: string;
  text: string;
  bg: string;
  dot: string;
  inputBorder: string;
}> = {
  'Perecíveis':  { border: 'border-l-cat-pereciveis', text: 'text-cat-pereciveis',  bg: 'bg-cat-pereciveis/8',  dot: 'bg-cat-pereciveis',  inputBorder: 'focus-visible:ring-cat-pereciveis/50 border-cat-pereciveis/30' },
  'Mercearia':   { border: 'border-l-cat-mercearia',  text: 'text-cat-mercearia',   bg: 'bg-cat-mercearia/8',   dot: 'bg-cat-mercearia',   inputBorder: 'focus-visible:ring-cat-mercearia/50 border-cat-mercearia/30' },
  'Eletro':      { border: 'border-l-cat-eletro',     text: 'text-cat-eletro',      bg: 'bg-cat-eletro/8',      dot: 'bg-cat-eletro',      inputBorder: 'focus-visible:ring-cat-eletro/50 border-cat-eletro/30' },
  'Hipel':       { border: 'border-l-cat-hipel',      text: 'text-cat-hipel',       bg: 'bg-cat-hipel/8',       dot: 'bg-cat-hipel',       inputBorder: 'focus-visible:ring-cat-hipel/50 border-cat-hipel/30' },
};

function getCatStyle(name: string) {
  return CATEGORY_STYLE[name] ?? {
    border: 'border-l-muted-foreground',
    text: 'text-muted-foreground',
    bg: 'bg-muted/30',
    dot: 'bg-muted-foreground',
    inputBorder: '',
  };
}

// CAPEX items with SLA risk
const SLA_RISK_KEYWORDS = ['segurança', 'freezer', 'redes', 'câmera', 'camera', 'seguranca'];
function hasSlaRisk(name: string): boolean {
  const lower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return SLA_RISK_KEYWORDS.some((k) => lower.includes(k));
}

type ConfirmState = 'idle' | 'loading' | 'success' | 'error';

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { user } = useAuthStore();

  const [store, setStore] = useState<StoreSummary | null>(null);
  const [plan, setPlan] = useState<PlanFullResponse | null>(null);
  const [myRole, setMyRole] = useState<StoreRole | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const [stockAvailMap, setStockAvailMap] = useState<Map<string, StockAvailabilityEntry>>(
    new Map(),
  );
  const [quizScore, setQuizScore] = useState<PlayerScoreResponse | null>(null);

  const finFirst = useRef(true);
  const finPrevRef = useRef<{ e: number; c: number } | null>(null);

  const { on } = useSocket(store?.sessionId, storeId);

  // ── Load ──────────────────────────────────────────────────────────────────

  const fetchStockAvailability = useCallback(async (sessionId: string, cv: number) => {
    try {
      const data = await api.get<StockAvailabilityEntry[]>(
        `/sessions/${sessionId}/stock-availability?configVersion=${cv}`,
      );
      setStockAvailMap(new Map(data.map((e) => [e.categoryId, e])));
    } catch {
      // non-blocking
    }
  }, []);

  const loadPlan = useCallback(
    async (sessionStatus: string) => {
      const cv = configVersionFromStatus(sessionStatus);
      const data = await api.get<PlanFullResponse>(`/plans/${storeId}/config/${cv}`);
      setPlan(data);
      return cv;
    },
    [storeId],
  );

  useEffect(() => {
    async function init() {
      try {
        const [storeData, membersData] = await Promise.all([
          api.get<StoreSummary>(`/stores/${storeId}`),
          api.get<{ storeId: string; storeName: string; members: StoreMemberEntry[] }>(
            `/stores/${storeId}/members`,
          ),
        ]);
        setStore(storeData);
        const me = membersData.members.find((m) => m.userId === user?.id);
        if (me) setMyRole(me.role);

        const sessionData = await api.get<{ status: string }>(`/sessions/${storeData.sessionId}/status`);
        const cv = await loadPlan(sessionData.status);
        await Promise.all([
          fetchStockAvailability(storeData.sessionId, cv),
          api
            .get<PlayerScoreResponse>(`/stores/${storeId}/quiz/my-score?round=${cv}`)
            .then(setQuizScore)
            .catch(() => {/* non-blocking */}),
        ]);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Erro ao carregar plano');
      }
    }
    if (user) init();
  }, [storeId, user, loadPlan, fetchStockAvailability]);

  useEffect(() => {
    return on<{ plan: PlanFullResponse }>('plan:updated', ({ plan: updated }) => {
      setPlan(updated);
    });
  }, [on]);

  const ebitdaValForAnim = useMemo(() => {
    if (!plan || !store) return 0;
    return buildDre(buildCatRows(plan.categoryDecisions), plan.financials).ebitda;
  }, [plan, store]);

  const cashValForAnim = useMemo(
    () => plan?.financials.availableCash ?? 0,
    [plan?.financials.availableCash],
  );

  const ebitdaFlash = useAnimatedValue(
    ebitdaValForAnim,
    !!(plan && store),
    plan?.id ?? null,
  );
  const cashFlash = useAnimatedValue(
    cashValForAnim,
    !!(plan && store),
    plan?.id ?? null,
  );

  useEffect(() => {
    finFirst.current = true;
    finPrevRef.current = null;
  }, [storeId, plan?.id]);

  useEffect(() => {
    setConfirmState('idle');
  }, [storeId, plan?.id]);

  useEffect(() => {
    if (!plan || !store) return;
    const e = buildDre(buildCatRows(plan.categoryDecisions), plan.financials).ebitda;
    const c = plan.financials.availableCash;
    if (finFirst.current) {
      finFirst.current = false;
      finPrevRef.current = { e, c };
      return;
    }
    const p = finPrevRef.current;
    if (p && (e !== p.e || c !== p.c)) {
      toast.info('Valores atualizados', { duration: 2000 });
    }
    finPrevRef.current = { e, c };
  }, [plan, store]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function mutate<B>(path: string, body: B) {
    if (!plan) return;
    setSaveError('');
    setSaving(true);
    try {
      const updated = await api.put<PlanFullResponse>(path, body);
      setPlan(updated);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleCategoryDecision(
    categoryId: string,
    stockPurchased: number,
    priceMargin: number,
  ) {
    if (!plan || !store) return;
    setSaveError('');
    setSaving(true);
    try {
      const updated = await api.put<PlanFullResponse>(`/plans/${plan.id}/category-decision`, {
        categoryId,
        stockPurchased,
        priceMargin,
      });
      setPlan(updated);
      await fetchStockAvailability(store.sessionId, plan.configVersion);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!plan) return;
    setConfirmState('loading');
    try {
      const updated = await api.post<PlanFullResponse>(`/plans/${plan.id}/confirm`, {});
      setPlan(updated);
      setConfirmState('success');
      toast.success('PO confirmado com sucesso!');
    } catch (err) {
      setConfirmState('error');
      const message = err instanceof Error ? err.message : 'Erro ao confirmar PO';
      toast.error(message);
      setTimeout(() => setConfirmState('idle'), 3000);
    }
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }
  if (!plan || !store) {
    return <POSkeleton />;
  }

  const editable = !plan.confirmed;
  const rows = buildCatRows(plan.categoryDecisions);
  const dre = buildDre(rows, plan.financials);

  // Cash gauge
  const totalCash = plan.financials.cashUsed + plan.financials.availableCash;
  const cashPct = totalCash > 0 ? Math.min((plan.financials.cashUsed / totalCash) * 100, 100) : 0;
  const cashCritical = plan.financials.availableCash < 0;
  const cashWarning = !cashCritical && cashPct > 75;

  const roundLabel = `Rodada ${plan.configVersion}`;
  const ebitdaPositive = dre.ebitda >= 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-foreground leading-tight truncate">
              {store.name}
            </h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
              Plano Operacional
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Live indicator */}
          {editable && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              AO VIVO
            </span>
          )}
          <Badge
            className="bg-primary/10 text-primary border-primary/20 font-mono text-xs px-3 py-1"
            variant="outline"
          >
            {roundLabel}
          </Badge>
          {plan.confirmed && (
            <Badge className="bg-accent/15 text-accent border-accent/30 gap-1.5" variant="outline">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmado
            </Badge>
          )}
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Salvando...
            </span>
          )}
        </div>
      </div>

      {/* ── METRIC CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* EBITDA R$ */}
        <div
          className={cn(
            'rounded-xl border p-4 shadow-sm transition-colors duration-300',
            ebitdaPositive
              ? 'bg-accent/8 border-accent/25'
              : 'bg-destructive/8 border-destructive/25',
            ebitdaFlash === 'up' && 'bg-accent/20',
            ebitdaFlash === 'down' && 'bg-destructive/20',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">EBITDA</p>
            {ebitdaPositive
              ? <TrendingUp className="h-4 w-4 text-accent" />
              : <TrendingDown className="h-4 w-4 text-destructive" />
            }
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`font-mono text-2xl font-bold leading-none ${
                ebitdaPositive ? 'text-accent' : 'text-destructive'
              }`}
            >
              {brl(dre.ebitda)}
            </p>
            {ebitdaFlash === 'up' && <span className="text-accent font-bold leading-none">↑</span>}
            {ebitdaFlash === 'down' && <span className="text-destructive font-bold leading-none">↓</span>}
          </div>
        </div>

        {/* EBITDA % */}
        <div className={`rounded-xl border p-4 shadow-sm bg-card border-border`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">EBITDA %</p>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`font-mono text-2xl font-bold leading-none ${ebitdaPositive ? 'text-accent' : 'text-destructive'}`}>
            {pct(dre.ebitdaPct)}
          </p>
        </div>

        {/* Cash gauge */}
        <div
          className={cn(
            'rounded-xl border p-4 shadow-sm col-span-2 lg:col-span-1 transition-colors duration-300',
            cashCritical
              ? 'bg-destructive/8 border-destructive/25'
              : cashWarning
                ? 'bg-warning/8 border-warning/25'
                : 'bg-card border-border',
            cashFlash === 'up' && 'bg-accent/20',
            cashFlash === 'down' && 'bg-destructive/20',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Caixa Disponível</p>
            <Wallet className={`h-4 w-4 ${cashCritical ? 'text-destructive' : cashWarning ? 'text-warning' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p
              className={`font-mono text-xl font-bold leading-none
            ${cashCritical ? 'text-destructive' : cashWarning ? 'text-warning' : 'text-foreground'}`}
            >
              {brl(plan.financials.availableCash)}
            </p>
            {cashFlash === 'up' && <span className="text-accent font-bold leading-none">↑</span>}
            {cashFlash === 'down' && <span className="text-destructive font-bold leading-none">↓</span>}
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500
                ${cashCritical ? 'bg-destructive' : cashWarning ? 'bg-warning' : 'bg-accent'}`}
              style={{ width: `${cashPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            {brl(plan.financials.cashUsed)} usado de {brl(totalCash)}
          </p>
        </div>

        {/* Total Vendas */}
        <div className="rounded-xl border p-4 shadow-sm bg-card border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total de Vendas</p>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-mono text-xl font-bold leading-none text-foreground">
            {brl(dre.totalVendas)}
          </p>
        </div>
      </div>

      {/* ── QUIZ BANNER ────────────────────────────────────────────────── */}
      {quizScore !== null && !plan.confirmed && (
        quizScore.answered ? (
          <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/8 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
              <CheckCircle2 className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-accent">Quiz respondido</p>
              <p className="text-xs text-muted-foreground font-mono">
                {quizScore.correctAnswers}/{quizScore.totalQuestions} corretas · {quizScore.scorePercentage.toFixed(0)}% de acerto
              </p>
            </div>
            {/* Score bar */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${quizScore.scorePercentage}%` }}
                />
              </div>
              <span className="text-xs font-mono text-accent font-bold">{quizScore.scorePercentage.toFixed(0)}%</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-warning/40 bg-warning/8 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15">
                <BookOpen className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--warning))' }}>
                  Quiz pendente
                </p>
                <p className="text-xs text-muted-foreground">
                  Responda o Quiz antes de confirmar o Plano Operacional
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 gap-1.5 font-semibold"
              style={{ backgroundColor: 'hsl(var(--warning))', color: 'hsl(var(--warning-foreground))' }}
              onClick={() => router.push(`/store/${storeId}/quiz`)}
            >
              Fazer Quiz
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      )}

      {saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{saveError}</p>
        </div>
      )}

      {/* ── TWO-COLUMN LAYOUT ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5 items-start">

        {/* ── LEFT: DRE ──────────────────────────────────────────────────── */}
        <div className="xl:sticky xl:top-[72px]">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-display">
                DRE — Plano Operacional
              </h2>
            </div>
            <Separator />
            <CardContent className="px-4 pb-2 pt-3 space-y-0">
              <DreLine label="Total de Vendas" value={brl(dre.totalVendas)} bold />
              <DreLine
                label="(-) Impostos"
                value={brl(dre.impostos)}
                pctVal={dre.totalVendas > 0 ? dre.impostos / dre.totalVendas : 0}
                indent
              />
              <DreLine label="Venda Líquida" value={brl(dre.vendaLiquida)} subtotal />
              <DreLine
                label="(-) Custo de Venda"
                value={brl(dre.custoVenda)}
                pctVal={dre.totalVendas > 0 ? dre.custoVenda / dre.totalVendas : 0}
                indent
              />
              <DreLine label="Massa Mg Líquida" value={brl(dre.massaMgLiquida)} subtotal />
              <DreLine
                label="(-) Quebras"
                value={brl(dre.quebras)}
                pctVal={dre.totalVendas > 0 ? dre.quebras / dre.totalVendas : 0}
                indent
              />
              <DreLine
                label="(-) Aging"
                value={brl(dre.aging)}
                pctVal={dre.totalVendas > 0 ? dre.aging / dre.totalVendas : 0}
                indent
              />
              <DreLine label="Massa Final" value={brl(dre.massaFinal)} subtotal />

              {/* Fixed costs section */}
              <div className="flex items-center gap-1.5 pt-2 pb-0.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                  Custos Fixos
                </span>
                <Separator className="flex-1 bg-border/50" />
              </div>

              <DreLine
                label="(-) Folha"
                value={brl(dre.folha)}
                pctVal={dre.totalVendas > 0 ? dre.folha / dre.totalVendas : 0}
                indent
              />
              <DreLine
                label="(-) Manutenção"
                value={brl(dre.manutencao)}
                pctVal={dre.totalVendas > 0 ? dre.manutencao / dre.totalVendas : 0}
                indent
              />
              <DreLine
                label="(-) Juros"
                value={brl(dre.juros)}
                pctVal={dre.totalVendas > 0 ? dre.juros / dre.totalVendas : 0}
                indent
              />
              <DreLine
                label="(-) Licenças"
                value={brl(dre.licencas)}
                pctVal={dre.totalVendas > 0 ? dre.licencas / dre.totalVendas : 0}
                indent
              />

              {/* EBITDA block */}
              <div
                className={`mt-3 mb-1 rounded-xl p-3 transition-all
                  ${ebitdaPositive
                    ? 'bg-accent/12 border border-accent/25'
                    : 'bg-destructive/12 border border-destructive/25'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    EBITDA
                  </span>
                  {ebitdaPositive
                    ? <TrendingUp className="h-3.5 w-3.5 text-accent" />
                    : <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  }
                </div>
                <div className="flex items-end justify-between gap-2">
                  <p className={`font-mono text-xl font-bold leading-none
                    ${ebitdaPositive ? 'text-accent' : 'text-destructive'}`}>
                    {brl(dre.ebitda)}
                  </p>
                  <p className={`font-mono text-sm font-semibold
                    ${ebitdaPositive ? 'text-accent/80' : 'text-destructive/80'}`}>
                    {pct(dre.ebitdaPct)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Loja ──────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Category table */}
          <Card className="overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                <ShoppingBag className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-display">
                Decisões por Categoria
              </h2>
            </div>
            <Separator />
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-44">
                      Campo
                    </th>
                    {rows.map((r) => {
                      const style = getCatStyle(r.categoryName);
                      return (
                        <th key={r.categoryId} className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                            <span className={`text-xs font-bold ${style.text}`}>
                              {r.categoryName}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <CatTableRow label="Custo Unit." rows={rows} getValue={(r) => brl(r.unitCost)} muted />

                  {/* Posição Estoque — EDITABLE */}
                  <tr className="border-b">
                    <td className="px-4 py-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">
                        Posição Estoque (un)
                      </span>
                    </td>
                    {rows.map((r) => {
                      const avail = stockAvailMap.get(r.categoryId);
                      const maxForStore = avail
                        ? avail.remaining + r.stockPurchased
                        : undefined;
                      const catStyle = getCatStyle(r.categoryName);
                      return (
                        <td key={r.categoryId} className={`px-2 py-2 text-right border-l-2 ${catStyle.border}`}>
                          <StockInput
                            value={r.stockPurchased}
                            disabled={!editable || saving}
                            maxAvailable={maxForStore}
                            catInputClass={catStyle.inputBorder}
                            onCommit={(v) =>
                              handleCategoryDecision(r.categoryId, v, r.priceMargin)
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right">
                      <span className="font-mono text-sm font-semibold">
                        {num(rows.reduce((s, r) => s + r.stockPurchased, 0))}
                      </span>
                    </td>
                  </tr>

                  {/* Margem Comercial — EDITABLE */}
                  <tr className="border-b">
                    <td className="px-4 py-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">
                        Margem Comercial
                      </span>
                    </td>
                    {rows.map((r) => {
                      const catStyle = getCatStyle(r.categoryName);
                      return (
                        <td key={r.categoryId} className={`px-2 py-2 text-right border-l-2 ${catStyle.border}`}>
                          <MarginInput
                            value={r.priceMargin}
                            disabled={!editable || saving}
                            catInputClass={catStyle.inputBorder}
                            onCommit={(v) =>
                              mutate(`/plans/${plan.id}/category-decision`, {
                                categoryId: r.categoryId,
                                stockPurchased: r.stockPurchased,
                                priceMargin: v,
                              })
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right text-muted-foreground text-xs font-mono">—</td>
                  </tr>

                  <CatTableRow label="R$ Total Venda" rows={rows} getValue={(r) => brl(r.totalVenda)} total={(r) => r.totalVenda} bold />
                  <CatTableRow label="R$ Impostos" rows={rows} getValue={(r) => brl(r.impostos)} total={(r) => r.impostos} muted />
                  <CatTableRow label="Total Estoque R$" rows={rows} getValue={(r) => brl(r.totalEstoque)} total={(r) => r.totalEstoque} muted />

                  {/* Separator */}
                  <tr>
                    <td colSpan={rows.length + 2} className="px-4 py-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">Perdas</span>
                        <Separator className="flex-1 bg-border/40" />
                      </div>
                    </td>
                  </tr>

                  <CatTableRow label="% Quebras" rows={rows} getValue={(r) => pct(r.breakageRate)} muted />
                  <CatTableRow label="R$ Quebras" rows={rows} getValue={(r) => brl(r.quebrasR)} total={(r) => r.quebrasR} muted />
                  <CatTableRow label="% Aging" rows={rows} getValue={(r) => pct(r.agingRate)} muted />
                  <CatTableRow label="R$ Aging" rows={rows} getValue={(r) => brl(r.agingR)} total={(r) => r.agingR} muted />
                </tbody>
              </table>
            </div>
          </Card>

          {/* Operadores */}
          <Card className="shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-display">
                Equipe Operacional
              </h2>
            </div>
            <Separator />
            <CardContent className="pt-4 pb-4">
              <OperadoresForm
                cashierOperators={plan.cashierOperators}
                serviceOperators={plan.serviceOperators}
                editable={editable}
                saving={saving}
                onSave={(cashier, service) =>
                  mutate(`/plans/${plan.id}/workforce`, {
                    cashierOperators: cashier,
                    serviceOperators: service,
                  })
                }
              />
            </CardContent>
          </Card>

          {/* CAPEX */}
          <Card className="shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-display">
                Investimentos (CAPEX)
              </h2>
            </div>
            <Separator />
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                {plan.capexDecisions.map((cx) => {
                  const risk = hasSlaRisk(cx.capexName);
                  const showRisk = risk && !cx.implemented;
                  return (
                    <div
                      key={cx.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md
                        ${cx.implemented
                          ? 'border-accent/25 bg-accent/5'
                          : showRisk
                            ? 'border-warning/30 bg-warning/5'
                            : 'border-border bg-card'
                        }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={cx.implemented}
                        disabled={!editable || saving}
                        onChange={(e) =>
                          mutate(`/plans/${plan.id}/capex-decision`, {
                            capexOptionId: cx.capexOptionId,
                            implemented: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-primary cursor-pointer disabled:cursor-not-allowed shrink-0"
                      />
                      {/* Name + risk */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${cx.implemented ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {cx.capexName}
                          </span>
                          {showRisk && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning uppercase tracking-wide">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Risco SLA
                            </span>
                          )}
                          {cx.implemented && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wide">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Ativo
                            </span>
                          )}
                        </div>
                        {showRisk && (
                          <p className="text-[11px] text-warning/80 mt-0.5">
                            Evento negativo possível se não implementado
                          </p>
                        )}
                      </div>
                      {/* Cost */}
                      <span className={`font-mono text-sm font-semibold shrink-0
                        ${cx.implemented ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {brl(cx.acquisitionCost)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── CONFIRM BUTTON ──────────────────────────────────────────── */}
          {myRole === 'STORE_MANAGER' && (plan.confirmed || confirmState === 'success') && (
            <Button
              type="button"
              disabled
              className="w-full h-14 text-base font-bold rounded-xl gap-2 shadow-lg bg-accent text-accent-foreground
                opacity-100 cursor-not-allowed"
            >
              <span className="text-lg leading-none" aria-hidden>
                ✓
              </span>
              PO Confirmado
            </Button>
          )}

          {myRole === 'STORE_MANAGER' && !plan.confirmed && confirmState !== 'success' && (
            <div className="relative">
              {confirmState === 'idle' && (
                <div className="absolute -inset-1 rounded-2xl bg-accent/20 blur-md animate-pulse" />
              )}
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={
                  saving ||
                  confirmState === 'loading' ||
                  confirmState === 'error'
                }
                className={cn(
                  'relative w-full h-14 text-base font-bold rounded-xl gap-3 shadow-lg text-accent-foreground',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  'transition-all duration-200',
                  confirmState === 'idle' &&
                    'bg-accent hover:bg-accent/90 hover:shadow-accent/25 hover:shadow-xl hover:-translate-y-0.5',
                  confirmState === 'loading' && 'bg-accent',
                  confirmState === 'error' &&
                    'bg-accent border-2 border-destructive ring-2 ring-destructive/30',
                )}
              >
                {confirmState === 'loading' ? (
                  <>
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2 shrink-0"
                      aria-hidden
                    />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    Confirmar Plano Operacional
                  </>
                )}
              </Button>
            </div>
          )}

          {plan.confirmed && myRole !== 'STORE_MANAGER' && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/8 py-4">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              <p className="text-sm font-semibold text-accent">
                Plano confirmado
                {plan.confirmedAt && (
                  <span className="font-normal text-muted-foreground ml-1">
                    em {new Date(plan.confirmedAt).toLocaleString('pt-BR')}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DreLine({
  label,
  value,
  pctVal,
  bold,
  subtotal,
  indent,
  danger,
}: {
  label: string;
  value: string;
  pctVal?: number;
  bold?: boolean;
  subtotal?: boolean;
  indent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-[5px] text-sm gap-2
        ${subtotal ? 'border-t border-border/60 mt-0.5 pt-2 font-semibold' : ''}
        ${bold ? 'font-bold text-[15px]' : ''}
        ${indent ? 'pl-3' : ''}
      `}
    >
      <span className={`flex-1 text-[13px] leading-snug ${indent ? 'text-muted-foreground' : ''}`}>
        {label}
      </span>
      <span className="text-right text-muted-foreground text-[11px] font-mono w-12 shrink-0">
        {pctVal !== undefined ? `${(pctVal * 100).toFixed(1)}%` : ''}
      </span>
      <span className={`text-right font-mono text-[13px] w-28 shrink-0 ${danger ? 'text-destructive' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// Read-only category table row
interface CatRowData {
  categoryId: string;
}
function CatTableRow<T extends CatRowData>({
  label,
  rows,
  getValue,
  total,
  muted,
  bold,
}: {
  label: string;
  rows: T[];
  getValue: (r: T) => string;
  total?: (r: T) => number;
  muted?: boolean;
  bold?: boolean;
}) {
  const totalVal = total ? rows.reduce((s, r) => s + total(r), 0) : null;
  const cellReadOnly =
    'cursor-default bg-muted/50 select-none px-3 py-2 text-right font-mono text-xs';
  return (
    <tr className="border-b last:border-0">
      <td
        className={`px-4 py-2 text-xs cursor-default ${muted ? 'text-muted-foreground' : bold ? 'font-semibold' : 'font-medium'}`}
      >
        {label}
      </td>
      {rows.map((r) => (
        <td
          key={r.categoryId}
          className={cn(
            cellReadOnly,
            muted ? 'text-muted-foreground' : bold ? 'font-semibold text-foreground' : 'text-foreground',
          )}
        >
          {getValue(r)}
        </td>
      ))}
      <td className={cn(cellReadOnly, 'px-4 font-semibold text-foreground')}>
        {totalVal !== null ? formatBrl(totalVal) : '—'}
      </td>
    </tr>
  );
}

// Editable stock input
function StockInput({
  value,
  disabled,
  onCommit,
  maxAvailable,
  catInputClass,
}: {
  value: number;
  disabled: boolean;
  onCommit: (v: number) => void;
  maxAvailable?: number;
  catInputClass?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const draftNum = Number(draft);
  const overLimit = maxAvailable !== undefined && !isNaN(draftNum) && draftNum > maxAvailable;

  return (
    <div>
      <Input
        type="number"
        min={0}
        max={maxAvailable}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = Number(draft);
          if (!isNaN(v) && v !== value) onCommit(v);
        }}
        disabled={disabled}
        className={cn(
          'w-24 text-right h-7 text-xs px-2 font-mono',
          catInputClass,
          overLimit && 'border-destructive focus-visible:ring-destructive',
          disabled && 'disabled:bg-muted/50 disabled:cursor-default',
        )}
      />
      {maxAvailable !== undefined && (
        <p className={`text-[10px] mt-0.5 text-right font-mono
          ${overLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          Disp: {maxAvailable.toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}

// Editable margin input
function MarginInput({
  value,
  disabled,
  onCommit,
  catInputClass,
}: {
  value: number;
  disabled: boolean;
  onCommit: (v: number) => void;
  catInputClass?: string;
}) {
  const [draft, setDraft] = useState(String(Math.round(value * 100)));
  useEffect(() => setDraft(String(Math.round(value * 100))), [value]);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Input
        type="number"
        min={0}
        max={500}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = Number(draft) / 100;
          if (!isNaN(v) && v !== value) onCommit(v);
        }}
        disabled={disabled}
        className={cn(
          'w-20 text-right h-7 text-xs px-2 font-mono',
          catInputClass,
          disabled && 'disabled:bg-muted/50 disabled:cursor-default',
        )}
      />
      <span className="text-muted-foreground text-xs font-mono">%</span>
    </div>
  );
}

// Operadores form
function OperadoresForm({
  cashierOperators,
  serviceOperators,
  editable,
  saving,
  onSave,
}: {
  cashierOperators: number;
  serviceOperators: number;
  editable: boolean;
  saving: boolean;
  onSave: (cashier: number, service: number) => void;
}) {
  const [cashier, setCashier] = useState(String(cashierOperators));
  const [service, setService] = useState(String(serviceOperators));

  useEffect(() => setCashier(String(cashierOperators)), [cashierOperators]);
  useEffect(() => setService(String(serviceOperators)), [serviceOperators]);

  function commit(newCashier: string, newService: string) {
    const c = Number(newCashier);
    const s = Number(newService);
    if (!isNaN(c) && !isNaN(s)) onSave(c, s);
  }

  const cashierCost = Number(cashier) * 1_000;
  const serviceCost = Number(service) * 1_200;
  const totalFolha = cashierCost + serviceCost;

  // CSAT hint: 10 caixas = máximo
  const cashierNum = Number(cashier);
  const csatPct = Math.min((cashierNum / 10) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Caixa */}
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
            Operadores de Caixa
          </label>
          <div className="flex items-center gap-2 mb-1.5">
            <Input
              type="number"
              min={0}
              max={10}
              value={cashier}
              onChange={(e) => setCashier(e.target.value)}
              onBlur={(e) => commit(e.target.value, service)}
              disabled={!editable || saving}
              className="w-20 h-8 text-sm text-right font-mono disabled:bg-muted/50 disabled:cursor-default"
            />
            <span className="text-sm font-mono font-semibold text-foreground">
              = {brl(cashierCost)}
            </span>
          </div>
          {/* CSAT indicator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">CSAT (caixa)</span>
              <span className={`text-[10px] font-mono font-semibold
                ${csatPct >= 80 ? 'text-accent' : csatPct >= 50 ? 'text-warning' : 'text-destructive'}`}>
                {csatPct.toFixed(0)}%
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500
                  ${csatPct >= 80 ? 'bg-accent' : csatPct >= 50 ? 'bg-warning' : 'bg-destructive'}`}
                style={{ width: `${csatPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Serviço */}
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
            Operadores de Serviço
          </label>
          <div className="flex items-center gap-2 mb-1.5">
            <Input
              type="number"
              min={0}
              max={5}
              value={service}
              onChange={(e) => setService(e.target.value)}
              onBlur={(e) => commit(cashier, e.target.value)}
              disabled={!editable || saving}
              className="w-20 h-8 text-sm text-right font-mono disabled:bg-muted/50 disabled:cursor-default"
            />
            <span className="text-sm font-mono font-semibold text-foreground">
              = {brl(serviceCost)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">0–5 define SLA de resolução</p>
        </div>
      </div>

      {/* Total folha */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground">Total Folha de Pagamento</span>
        <span className="font-mono text-sm font-bold text-foreground">
          {brl(totalFolha)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Ideal: 10 caixas para CSAT máximo · Serviço 0–5 define SLA de resolução
      </p>
    </div>
  );
}
