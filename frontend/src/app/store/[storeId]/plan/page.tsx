'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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
  scorePercentage: number; // 0–100
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

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number) => n.toLocaleString('pt-BR');

// Compute per-category derived values
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

// Compute DRE from rows + financials
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [store, setStore] = useState<StoreSummary | null>(null);
  const [plan, setPlan] = useState<PlanFullResponse | null>(null);
  const [myRole, setMyRole] = useState<StoreRole | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [stockAvailMap, setStockAvailMap] = useState<Map<string, StockAvailabilityEntry>>(
    new Map(),
  );
  const [quizScore, setQuizScore] = useState<PlayerScoreResponse | null>(null);

  const { on } = useSocket(store?.sessionId, storeId);

  // ── Load ──────────────────────────────────────────────────────────────────

  const fetchStockAvailability = useCallback(async (sessionId: string, cv: number) => {
    try {
      const data = await api.get<StockAvailabilityEntry[]>(
        `/sessions/${sessionId}/stock-availability?configVersion=${cv}`,
      );
      setStockAvailMap(new Map(data.map((e) => [e.categoryId, e])));
    } catch {
      // non-blocking — plan page still works without availability data
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

  // Socket: live plan updates
  useEffect(() => {
    return on<{ plan: PlanFullResponse }>('plan:updated', ({ plan: updated }) => {
      setPlan(updated);
    });
  }, [on]);

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
    setConfirming(true);
    try {
      const updated = await api.post<PlanFullResponse>(`/plans/${plan.id}/confirm`, {});
      setPlan(updated);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Erro ao confirmar');
    } finally {
      setConfirming(false);
    }
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }
  if (!plan || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando plano...
      </div>
    );
  }

  const editable = !plan.confirmed;
  const rows = buildCatRows(plan.categoryDecisions);
  const dre = buildDre(rows, plan.financials);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold">{store.name}</h1>
            {plan.confirmed && <Badge variant="outline" className="text-green-700 border-green-400">Confirmado</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={() => { logout(); router.push('/login'); }}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Caixa usado" value={brl(plan.financials.cashUsed)} />
          <SummaryCard
            label="Caixa disponível"
            value={brl(plan.financials.availableCash)}
            danger={plan.financials.availableCash < 0}
          />
          <SummaryCard label="EBITDA projetado" value={brl(dre.ebitda)} danger={dre.ebitda < 0} />
          <SummaryCard
            label="EBITDA %"
            value={pct(dre.ebitdaPct)}
            danger={dre.ebitdaPct < 0}
          />
        </div>

        {/* Quiz status banner */}
        {quizScore !== null && !plan.confirmed && (
          quizScore.answered ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <span className="text-green-700 font-medium text-sm">
                ✓ Quiz respondido —{' '}
                {quizScore.correctAnswers}/{quizScore.totalQuestions} corretas
                ({quizScore.scorePercentage.toFixed(0)}%)
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2.5">
              <span className="text-yellow-800 font-medium text-sm">
                ⚠ Responda o Quiz antes de confirmar o PO
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-400 text-yellow-800 hover:bg-yellow-100 shrink-0"
                onClick={() => router.push(`/store/${storeId}/quiz`)}
              >
                Ir para o Quiz →
              </Button>
            </div>
          )
        )}

        {saveError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{saveError}</p>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5 items-start">

          {/* ── LEFT: DRE ─────────────────────────────────────────────────── */}
          <Card className="xl:sticky xl:top-[72px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Plano Operacional
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <DreLine label="Total de Vendas" value={brl(dre.totalVendas)} bold />
              <DreLine
                label="(-) Impostos"
                value={brl(dre.impostos)}
                pctVal={dre.totalVendas > 0 ? dre.impostos / dre.totalVendas : 0}
                indent
              />
              <DreLine label="Total Venda Líquida" value={brl(dre.vendaLiquida)} subtotal />
              <DreLine
                label="(-) Custo Venda"
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
              <DreLine
                label="(-) Folha de Pagamento"
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
                label="(-) Juros s/ empréstimos"
                value={brl(dre.juros)}
                pctVal={dre.totalVendas > 0 ? dre.juros / dre.totalVendas : 0}
                indent
              />
              <DreLine
                label="(-) Licença de Softwares"
                value={brl(dre.licencas)}
                pctVal={dre.totalVendas > 0 ? dre.licencas / dre.totalVendas : 0}
                indent
              />
              <div className="border-t-2 border-foreground/20 mt-1" />
              <DreLine
                label="EBITDA"
                value={brl(dre.ebitda)}
                pctVal={dre.ebitdaPct}
                bold
                danger={dre.ebitda < 0}
              />
            </CardContent>
          </Card>

          {/* ── RIGHT: Loja ──────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Category table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Loja — Decisões por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-44">Campo</th>
                      {rows.map((r) => (
                        <th key={r.categoryId} className="text-right px-3 py-2 font-medium">
                          {r.categoryName}
                        </th>
                      ))}
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Custo Unit */}
                    <CatRow label="Custo Unit." rows={rows} getValue={(r) => brl(r.unitCost)} muted />

                    {/* Posição Estoque — EDITABLE */}
                    <tr className="border-b bg-blue-50/30">
                      <td className="px-3 py-1.5 font-medium text-blue-700 text-xs uppercase tracking-wide">
                        Posição Estoque (un)
                      </td>
                      {rows.map((r) => {
                        const avail = stockAvailMap.get(r.categoryId);
                        // maxForThisStore = remaining (excl. others) = global remaining + my current purchase
                        const maxForStore = avail
                          ? avail.remaining + r.stockPurchased
                          : undefined;
                        return (
                          <td key={r.categoryId} className="px-2 py-1.5 text-right">
                            <StockInput
                              value={r.stockPurchased}
                              disabled={!editable || saving}
                              maxAvailable={maxForStore}
                              onCommit={(v) =>
                                handleCategoryDecision(r.categoryId, v, r.priceMargin)
                              }
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-right font-semibold">
                        {num(rows.reduce((s, r) => s + r.stockPurchased, 0))}
                      </td>
                    </tr>

                    {/* Margem Comercial — EDITABLE */}
                    <tr className="border-b bg-blue-50/30">
                      <td className="px-3 py-1.5 font-medium text-blue-700 text-xs uppercase tracking-wide">
                        Margem Comercial
                      </td>
                      {rows.map((r) => (
                        <td key={r.categoryId} className="px-2 py-1.5 text-right">
                          <MarginInput
                            value={r.priceMargin}
                            disabled={!editable || saving}
                            onCommit={(v) =>
                              mutate(`/plans/${plan.id}/category-decision`, {
                                categoryId: r.categoryId,
                                stockPurchased: r.stockPurchased,
                                priceMargin: v,
                              })
                            }
                          />
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-right text-muted-foreground text-xs">—</td>
                    </tr>

                    {/* R$ Total Venda */}
                    <CatRow
                      label="R$ Total Venda"
                      rows={rows}
                      getValue={(r) => brl(r.totalVenda)}
                      total={(r) => r.totalVenda}
                    />

                    {/* R$ Impostos */}
                    <CatRow
                      label="R$ Impostos"
                      rows={rows}
                      getValue={(r) => brl(r.impostos)}
                      total={(r) => r.impostos}
                      muted
                    />

                    {/* Total Estoque R$ */}
                    <CatRow
                      label="Total Estoque R$"
                      rows={rows}
                      getValue={(r) => brl(r.totalEstoque)}
                      total={(r) => r.totalEstoque}
                      muted
                    />

                    {/* % Quebras */}
                    <CatRow
                      label="% Quebras"
                      rows={rows}
                      getValue={(r) => pct(r.breakageRate)}
                      muted
                    />

                    {/* R$ Quebras */}
                    <CatRow
                      label="R$ Quebras"
                      rows={rows}
                      getValue={(r) => brl(r.quebrasR)}
                      total={(r) => r.quebrasR}
                      muted
                    />

                    {/* % Aging */}
                    <CatRow
                      label="% Aging"
                      rows={rows}
                      getValue={(r) => pct(r.agingRate)}
                      muted
                    />

                    {/* R$ Aging */}
                    <CatRow
                      label="R$ Aging"
                      rows={rows}
                      getValue={(r) => brl(r.agingR)}
                      total={(r) => r.agingR}
                      muted
                    />
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Operadores */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Equipe Operacional
                </CardTitle>
              </CardHeader>
              <CardContent>
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  CAPEX
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="pb-2 pr-4 font-medium">Investimento</th>
                      <th className="pb-2 pr-4 text-right font-medium">Custo</th>
                      <th className="pb-2 text-center font-medium">Implementar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.capexDecisions.map((cx) => (
                      <tr key={cx.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{cx.capexName}</td>
                        <td className="py-2 pr-4 text-right">{brl(cx.acquisitionCost)}</td>
                        <td className="py-2 text-center">
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
                            className="h-4 w-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Confirm */}
            {myRole === 'STORE_MANAGER' && !plan.confirmed && (
              <div className="flex justify-end">
                <Button onClick={handleConfirm} disabled={confirming || saving} size="lg">
                  {confirming ? 'Confirmando...' : 'Confirmar Plano Operacional'}
                </Button>
              </div>
            )}
            {plan.confirmed && (
              <p className="text-sm text-center text-green-600">
                Plano confirmado em{' '}
                {plan.confirmedAt ? new Date(plan.confirmedAt).toLocaleString('pt-BR') : '—'}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold mt-0.5 ${danger ? 'text-destructive' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// DRE line component
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
      className={`flex items-center justify-between py-1 text-sm gap-2
        ${subtotal ? 'border-t border-border/60 mt-0.5 pt-1.5 font-semibold' : ''}
        ${bold ? 'font-bold text-base' : ''}
        ${indent ? 'pl-3' : ''}
      `}
    >
      <span className={`flex-1 ${indent ? 'text-muted-foreground' : ''}`}>{label}</span>
      <span className="text-right text-muted-foreground text-xs w-14 shrink-0">
        {pctVal !== undefined ? `${(pctVal * 100).toFixed(1)}%` : ''}
      </span>
      <span className={`text-right font-mono w-28 shrink-0 ${danger ? 'text-destructive' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// Read-only category table row
interface CatRowData {
  categoryId: string;
}
function CatRow<T extends CatRowData>({
  label,
  rows,
  getValue,
  total,
  muted,
}: {
  label: string;
  rows: T[];
  getValue: (r: T) => string;
  total?: (r: T) => number;
  muted?: boolean;
}) {
  const totalVal = total ? rows.reduce((s, r) => s + total(r), 0) : null;
  return (
    <tr className="border-b last:border-0">
      <td className={`px-3 py-1.5 ${muted ? 'text-muted-foreground text-xs' : 'font-medium text-xs'}`}>
        {label}
      </td>
      {rows.map((r) => (
        <td key={r.categoryId} className={`px-3 py-1.5 text-right text-xs ${muted ? 'text-muted-foreground' : ''}`}>
          {getValue(r)}
        </td>
      ))}
      <td className="px-3 py-1.5 text-right text-xs font-semibold">
        {totalVal !== null
          ? totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
          : '—'}
      </td>
    </tr>
  );
}

// Editable input for stockPurchased
function StockInput({
  value,
  disabled,
  onCommit,
  maxAvailable,
}: {
  value: number;
  disabled: boolean;
  onCommit: (v: number) => void;
  maxAvailable?: number;
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
        className={`w-24 text-right h-7 text-xs px-2 ${overLimit ? 'border-destructive focus-visible:ring-destructive' : ''}`}
      />
      {maxAvailable !== undefined && (
        <p className={`text-xs mt-0.5 text-right ${overLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          Disp.: {maxAvailable.toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}

// Editable input for priceMargin (shown as %)
function MarginInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onCommit: (v: number) => void;
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
        className="w-20 text-right h-7 text-xs px-2"
      />
      <span className="text-muted-foreground text-xs">%</span>
    </div>
  );
}

// Operadores form with inline save on blur
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-sm text-nowrap w-44">Operadores de Caixa</label>
          <Input
            type="number"
            min={0}
            max={10}
            value={cashier}
            onChange={(e) => setCashier(e.target.value)}
            onBlur={(e) => commit(e.target.value, service)}
            disabled={!editable || saving}
            className="w-20 h-8 text-sm text-right"
          />
          <span className="text-sm text-muted-foreground text-nowrap">
            = {cashierCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-sm text-nowrap w-44">Operadores de Serviço</label>
          <Input
            type="number"
            min={0}
            max={5}
            value={service}
            onChange={(e) => setService(e.target.value)}
            onBlur={(e) => commit(cashier, e.target.value)}
            disabled={!editable || saving}
            className="w-20 h-8 text-sm text-right"
          />
          <span className="text-sm text-muted-foreground text-nowrap">
            = {serviceCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Ideal: 10 caixas para CSAT máximo · Serviço 0–5 define SLA de resolução
      </p>
    </div>
  );
}
