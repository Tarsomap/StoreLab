'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface SessionStatus {
  id: string;
  status: string;
}

interface StoreMemberEntry {
  userId: string;
  name: string;
  role: StoreRole;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function configVersionFromStatus(status: string): number {
  if (status === 'ROUND_3') return 3;
  if (status === 'RECONFIGURATION' || status === 'ROUND_2') return 2;
  return 1;
}

const fmt = (n: number) => n.toLocaleString('pt-BR');
const fmtBrl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const CAN_EDIT_ESTOQUE: StoreRole[] = ['SUPPLY_MANAGER', 'STORE_MANAGER'];
const CAN_EDIT_PRICING: StoreRole[] = ['COMMERCIAL_MANAGER', 'STORE_MANAGER'];
const CAN_EDIT_OPERADORES: StoreRole[] = ['OPERATIONAL_MANAGER', 'STORE_MANAGER'];
const CAN_EDIT_CAPEX: StoreRole[] = ['SERVICE_MANAGER', 'STORE_MANAGER'];

// ── Page ──────────────────────────────────────────────────────────────────────

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

  const { on } = useSocket(store?.sessionId, storeId);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadPlan = useCallback(
    async (sessionStatus: string) => {
      const cv = configVersionFromStatus(sessionStatus);
      const data = await api.get<PlanFullResponse>(`/plans/${storeId}/config/${cv}`);
      setPlan(data);
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

        const sessionData = await api.get<SessionStatus>(`/sessions/${storeData.sessionId}/status`);
        await loadPlan(sessionData.status);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Erro ao carregar plano');
      }
    }
    if (user) init();
  }, [storeId, user, loadPlan]);

  // ── Socket: live plan updates ────────────────────────────────────────────────

  useEffect(() => {
    return on<{ plan: PlanFullResponse }>('plan:updated', ({ plan: updated }) => {
      setPlan(updated);
    });
  }, [on]);

  // ── Mutation helpers ─────────────────────────────────────────────────────────

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

  function handleLogout() {
    logout();
    router.push('/login');
  }

  // ── Loading / error states ───────────────────────────────────────────────────

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

  const canEdit = (roles: StoreRole[]) => !plan.confirmed && myRole !== null && roles.includes(myRole);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{store.name}</h1>
            {plan.confirmed && <Badge variant="success">Confirmado</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Financial summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Caixa usado" value={fmtBrl(plan.financials.cashUsed)} />
          <SummaryCard
            label="Caixa disponível"
            value={fmtBrl(plan.financials.availableCash)}
            highlight={plan.financials.availableCash < 0}
          />
          <SummaryCard label="EBITDA projetado" value={fmtBrl(plan.financials.projectedEbitda)} />
          <SummaryCard
            label="EBITDA %"
            value={fmtPct(plan.financials.projectedEbitdaPercentage)}
            highlight={plan.financials.projectedEbitdaPercentage < 0}
          />
        </div>

        {/* Errors */}
        {saveError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{saveError}</p>
        )}

        {/* Tabs */}
        <Tabs defaultValue="estoque">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="estoque">Estoque</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="operadores">Operadores</TabsTrigger>
            <TabsTrigger value="capex">CAPEX</TabsTrigger>
          </TabsList>

          {/* ── Estoque ── */}
          <TabsContent value="estoque">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decisões de Estoque</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="pb-2 pr-4">Categoria</th>
                      <th className="pb-2 pr-4 text-right">Custo unit.</th>
                      <th className="pb-2 pr-4 text-right">Qtd comprada</th>
                      <th className="pb-2 text-right">Custo total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.categoryDecisions.map((cat) => (
                      <CategoryStockRow
                        key={cat.id}
                        cat={cat}
                        editable={canEdit(CAN_EDIT_ESTOQUE)}
                        saving={saving}
                        onSave={(stockPurchased) =>
                          mutate(`/plans/${plan.id}/category-decision`, {
                            categoryId: cat.categoryId,
                            stockPurchased,
                            priceMargin: cat.priceMargin,
                          })
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pricing ── */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decisões de Preço</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="pb-2 pr-4">Categoria</th>
                      <th className="pb-2 pr-4 text-right">Custo unit.</th>
                      <th className="pb-2 pr-4 text-right">Margem %</th>
                      <th className="pb-2 text-right">Preço venda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.categoryDecisions.map((cat) => (
                      <CategoryPricingRow
                        key={cat.id}
                        cat={cat}
                        editable={canEdit(CAN_EDIT_PRICING)}
                        saving={saving}
                        onSave={(priceMargin) =>
                          mutate(`/plans/${plan.id}/category-decision`, {
                            categoryId: cat.categoryId,
                            stockPurchased: cat.stockPurchased,
                            priceMargin,
                          })
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Operadores ── */}
          <TabsContent value="operadores">
            <Card>
              <CardContent className="pt-6">
                <WorkforceForm
                  cashierOperators={plan.cashierOperators}
                  serviceOperators={plan.serviceOperators}
                  editable={canEdit(CAN_EDIT_OPERADORES)}
                  saving={saving}
                  financials={plan.financials}
                  onSave={(cashier, service) =>
                    mutate(`/plans/${plan.id}/workforce`, {
                      cashierOperators: cashier,
                      serviceOperators: service,
                    })
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CAPEX ── */}
          <TabsContent value="capex">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decisões de CAPEX</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="pb-2 pr-4">Investimento</th>
                      <th className="pb-2 pr-4 text-right">Custo</th>
                      <th className="pb-2 text-center">Implementar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.capexDecisions.map((cx) => (
                      <tr key={cx.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{cx.capexName}</td>
                        <td className="py-2 pr-4 text-right">{fmtBrl(cx.acquisitionCost)}</td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={cx.implemented}
                            disabled={!canEdit(CAN_EDIT_CAPEX) || saving}
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
          </TabsContent>
        </Tabs>

        {/* Cost breakdown */}
        <CostBreakdown financials={plan.financials} />

        {/* Confirm */}
        {myRole === 'STORE_MANAGER' && !plan.confirmed && (
          <div className="flex justify-end">
            <Button onClick={handleConfirm} disabled={confirming || saving}>
              {confirming ? 'Confirmando...' : 'Confirmar Plano Operacional'}
            </Button>
          </div>
        )}
        {plan.confirmed && (
          <p className="text-sm text-center text-green-600">
            Plano confirmado em {plan.confirmedAt ? new Date(plan.confirmedAt).toLocaleString('pt-BR') : '—'}
          </p>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold mt-0.5 ${highlight ? 'text-destructive' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function CategoryStockRow({
  cat,
  editable,
  saving,
  onSave,
}: {
  cat: CategoryDecisionEntry;
  editable: boolean;
  saving: boolean;
  onSave: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(cat.stockPurchased));

  useEffect(() => { setDraft(String(cat.stockPurchased)); }, [cat.stockPurchased]);

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4">{cat.categoryName}</td>
      <td className="py-2 pr-4 text-right">{cat.unitCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td className="py-2 pr-4 text-right">
        {editable ? (
          <Input
            type="number"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const v = Number(draft);
              if (!isNaN(v) && v !== cat.stockPurchased) onSave(v);
            }}
            disabled={saving}
            className="w-24 text-right h-8 text-sm"
          />
        ) : (
          cat.stockPurchased.toLocaleString('pt-BR')
        )}
      </td>
      <td className="py-2 text-right">{cat.lineCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</td>
    </tr>
  );
}

function CategoryPricingRow({
  cat,
  editable,
  saving,
  onSave,
}: {
  cat: CategoryDecisionEntry;
  editable: boolean;
  saving: boolean;
  onSave: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(cat.priceMargin * 100)));

  useEffect(() => { setDraft(String(Math.round(cat.priceMargin * 100))); }, [cat.priceMargin]);

  const sellPrice = cat.unitCost * (1 + cat.priceMargin);

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4">{cat.categoryName}</td>
      <td className="py-2 pr-4 text-right">{cat.unitCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td className="py-2 pr-4 text-right">
        {editable ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              min={0}
              max={500}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                const v = Number(draft) / 100;
                if (!isNaN(v) && v !== cat.priceMargin) onSave(v);
              }}
              disabled={saving}
              className="w-20 text-right h-8 text-sm"
            />
            <span className="text-muted-foreground text-xs">%</span>
          </div>
        ) : (
          `${Math.round(cat.priceMargin * 100)}%`
        )}
      </td>
      <td className="py-2 text-right">{sellPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
    </tr>
  );
}

function WorkforceForm({
  cashierOperators,
  serviceOperators,
  editable,
  saving,
  financials,
  onSave,
}: {
  cashierOperators: number;
  serviceOperators: number;
  editable: boolean;
  saving: boolean;
  financials: PlanFinancials;
  onSave: (cashier: number, service: number) => void;
}) {
  const [cashier, setCashier] = useState(String(cashierOperators));
  const [service, setService] = useState(String(serviceOperators));

  useEffect(() => { setCashier(String(cashierOperators)); }, [cashierOperators]);
  useEffect(() => { setService(String(serviceOperators)); }, [serviceOperators]);

  function submit() {
    const c = Number(cashier);
    const s = Number(service);
    if (!isNaN(c) && !isNaN(s)) onSave(c, s);
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="cashier">Operadores de Caixa</Label>
          <p className="text-xs text-muted-foreground">CSAT ideal = 10 caixas</p>
          <Input
            id="cashier"
            type="number"
            min={0}
            value={cashier}
            onChange={(e) => setCashier(e.target.value)}
            disabled={!editable || saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="service">Operadores de Serviço</Label>
          <p className="text-xs text-muted-foreground">Reduz risco de SLA (tabela 0–5)</p>
          <Input
            id="service"
            type="number"
            min={0}
            max={5}
            value={service}
            onChange={(e) => setService(e.target.value)}
            disabled={!editable || saving}
          />
        </div>
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        <p>Folha de pagamento: <strong>{financials.payrollCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</strong></p>
        <p>Licença: <strong>{financials.licenseCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</strong></p>
      </div>
      {editable && (
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar operadores'}
        </Button>
      )}
    </div>
  );
}

function CostBreakdown({ financials }: { financials: PlanFinancials }) {
  const fmt0 = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const items = [
    { label: 'Receita bruta projetada', value: fmt0(financials.projectedGrossRevenue), positive: true },
    { label: 'Folha de pagamento', value: fmt0(financials.payrollCost) },
    { label: 'Manutenção', value: fmt0(financials.maintenanceCost) },
    { label: 'Licenças', value: fmt0(financials.licenseCost) },
    { label: 'Juros', value: fmt0(financials.interestCost) },
    { label: 'Caixa usado', value: fmt0(financials.cashUsed) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground font-medium">Detalhamento de custos</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-muted-foreground text-xs">{item.label}</dt>
              <dd className={`font-medium ${item.positive ? 'text-green-600' : ''}`}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
