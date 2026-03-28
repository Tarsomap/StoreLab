'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, Clock } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionStatus =
  | 'SETUP'
  | 'ROUND_1_CONFIG'
  | 'ROUND_1'
  | 'RECONFIGURATION'
  | 'ROUND_2'
  | 'ROUND_3'
  | 'FINISHED';

type StoreRole =
  | 'STORE_MANAGER'
  | 'SUPPLY_MANAGER'
  | 'COMMERCIAL_MANAGER'
  | 'OPERATIONAL_MANAGER'
  | 'SERVICE_MANAGER';

interface StoreMember {
  userId: string;
  name: string;
  role: StoreRole;
}

interface StoreStatus {
  storeId: string;
  storeName: string;
  accessCode: string;
  memberCount: number;
  members: StoreMember[];
  planConfirmed: boolean;
  cashUsed: number;
  availableCash: number;
  lastRound: number | null;
  lastRoundEbitda: number | null;
  lastRoundEbitdaPct: number | null;
}

interface SessionDetail {
  id: string;
  name: string;
  status: SessionStatus;
  totalDemand: number;
  initialCash: number;
}

interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  stores: StoreStatus[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<SessionStatus, string> = {
  SETUP: '1ª Configuração — Preparação',
  ROUND_1_CONFIG: '1ª Configuração — Aguardando POs',
  ROUND_1: 'Rodada 1 em andamento',
  RECONFIGURATION: '2ª Configuração (Reconfiguração)',
  ROUND_2: 'Rodada 2 em andamento',
  ROUND_3: 'Rodada 3 em andamento',
  FINISHED: 'Resultado Final',
};

const PHASE_STEPS: { label: string; statuses: SessionStatus[] }[] = [
  { label: '1ª Configuração', statuses: ['SETUP', 'ROUND_1_CONFIG'] },
  { label: 'Rodada 1', statuses: ['ROUND_1'] },
  { label: '2ª Configuração', statuses: ['RECONFIGURATION'] },
  { label: 'Rodada 2', statuses: ['ROUND_2'] },
  { label: 'Rodada 3', statuses: ['ROUND_3'] },
  { label: 'Resultado', statuses: ['FINISHED'] },
];

const ROLE_LABELS: Record<StoreRole, string> = {
  STORE_MANAGER: 'Gerente da Loja',
  SUPPLY_MANAGER: 'Abastecimento',
  COMMERCIAL_MANAGER: 'Comercial',
  OPERATIONAL_MANAGER: 'Operacional',
  SERVICE_MANAGER: 'Serviços',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function getActiveStepIndex(status: SessionStatus): number {
  return PHASE_STEPS.findIndex((s) => s.statuses.includes(status));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionManagementPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [statusData, setStatusData] = useState<SessionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateStore, setShowCreateStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);
  const [createStoreError, setCreateStoreError] = useState('');

  const [advancing, setAdvancing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [actionError, setActionError] = useState('');

  const [copiedCode, setCopiedCode] = useState<string | null>(null);


  async function fetchData() {
    setError('');
    try {
      const [sessionRes, statusRes] = await Promise.all([
        api.get<SessionDetail>(`/sessions/${sessionId}`),
        api.get<SessionStatusResponse>(`/sessions/${sessionId}/status`),
      ]);
      setSession(sessionRes);
      setStatusData(statusRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar sessão');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleCreateStore(e: FormEvent) {
    e.preventDefault();
    setCreateStoreError('');
    setCreatingStore(true);
    try {
      await api.post('/stores', { sessionId, name: newStoreName.trim() });
      setNewStoreName('');
      setShowCreateStore(false);
      await fetchData();
    } catch (err) {
      setCreateStoreError(err instanceof ApiError ? err.message : 'Erro ao criar loja');
    } finally {
      setCreatingStore(false);
    }
  }

  async function handleAdvance() {
    setActionError('');
    setAdvancing(true);
    try {
      await api.patch(`/sessions/${sessionId}/advance`, {});
      await fetchData();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao avançar fase');
    } finally {
      setAdvancing(false);
    }
  }

  async function handleExecute() {
    setActionError('');
    setExecuting(true);
    try {
      await api.post(`/sessions/${sessionId}/execute`, {});
      await fetchData();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao executar rodada');
    } finally {
      setExecuting(false);
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-muted-foreground">Carregando sessão...</p>
      </div>
    );
  }

  if (error || !session || !statusData) {
    return (
      <div className="flex items-center justify-center py-32">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive">{error || 'Sessão não encontrada'}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Voltar ao dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = session.status as SessionStatus;
  const storeCount = statusData.stores.length;
  const confirmedCount = statusData.stores.filter((s) => s.planConfirmed).length;
  const allConfirmed = storeCount > 0 && confirmedCount === storeCount;
  const canCreateStore = status === 'SETUP' && storeCount < 4;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="text-muted-foreground px-0 hover:bg-transparent"
        >
          ← Dashboard
        </Button>
        <span>/</span>
        <span className="font-medium text-foreground truncate max-w-[200px]">{session.name}</span>
      </div>

        {/* ── Phase Banner + Stepper ── */}
        <Card>
          <CardContent className="pt-5 pb-5 space-y-4">
            {/* Phase label */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                  Fase atual
                </p>
                <h2 className="text-lg font-bold">{PHASE_LABEL[status]}</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{confirmedCount}/{storeCount} POs confirmados</span>
              </div>
            </div>

            {/* Stepper */}
            <PhaseStepper activeIndex={getActiveStepIndex(status)} />
          </CardContent>
        </Card>

        {/* ── Session Info + Contextual Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Session info */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <InfoTile label="Demanda Total" value={session.totalDemand.toLocaleString('pt-BR')} />
                <InfoTile label="Caixa Inicial" value={brl(session.initialCash)} />
                <InfoTile label="Lojas" value={`${storeCount} / 4`} />
                <InfoTile label="POs Confirmados" value={`${confirmedCount} / ${storeCount}`} />
              </div>
              {/* Quick links */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/session/${sessionId}/quiz`)}
                >
                  Gerenciar Quiz
                </Button>
                {['ROUND_1', 'RECONFIGURATION', 'ROUND_2', 'ROUND_3', 'FINISHED'].includes(status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/session/${sessionId}/results`)}
                  >
                    Ver Resultados
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contextual actions */}
          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-2">
              <CardTitle className="font-display font-semibold text-sm uppercase tracking-wide">
                Ações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionError && (
                <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
                  {actionError}
                </p>
              )}
              <ContextualActions
                status={status}
                allConfirmed={allConfirmed}
                advancing={advancing}
                executing={executing}
                sessionId={sessionId}
                onAdvance={handleAdvance}
                onExecute={handleExecute}
                onNavigate={router.push}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Stores ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Lojas ({storeCount}/4)</h2>
            {canCreateStore && (
              <Button size="sm" variant="outline" onClick={() => setShowCreateStore((v) => !v)}>
                {showCreateStore ? 'Cancelar' : '+ Nova loja'}
              </Button>
            )}
          </div>

          {showCreateStore && (
            <Card>
              <form onSubmit={handleCreateStore}>
                <CardContent className="pt-4 space-y-4">
                  {createStoreError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                      {createStoreError}
                    </p>
                  )}
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="store-name">Nome da loja</Label>
                      <Input
                        id="store-name"
                        placeholder="Ex: Loja Bretas"
                        required
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={creatingStore}>
                      {creatingStore ? 'Criando...' : 'Criar'}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          )}

          {storeCount === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                Nenhuma loja criada ainda. Crie até 4 lojas para os times.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {statusData.stores.map((store) => (
                <StoreCard
                  key={store.storeId}
                  store={store}
                  initialCash={session.initialCash}
                  copiedCode={copiedCode}
                  onCopy={copyCode}
                />
              ))}
            </div>
          )}
        </div>
    </div>
  );
}

// ── PhaseStepper ──────────────────────────────────────────────────────────────

function PhaseStepper({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center w-full overflow-x-auto pb-1">
      {PHASE_STEPS.map((step, idx) => {
        const isDone = idx < activeIndex;
        const isActive = idx === activeIndex;
        return (
          <div key={step.label} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isDone
                    ? 'bg-accent text-accent-foreground'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground border border-muted-foreground/20'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span
                className={`mt-1 text-xs text-center leading-tight whitespace-nowrap max-w-[72px] ${
                  isActive ? 'text-primary font-semibold' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/50'
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {idx < PHASE_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 ${
                  idx < activeIndex ? 'bg-accent' : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── ContextualActions ─────────────────────────────────────────────────────────

interface ContextualActionsProps {
  status: SessionStatus;
  allConfirmed: boolean;
  advancing: boolean;
  executing: boolean;
  sessionId: string;
  onAdvance: () => void;
  onExecute: () => void;
  onNavigate: (path: string) => void;
}

function ContextualActions({
  status,
  allConfirmed,
  advancing,
  executing,
  sessionId,
  onAdvance,
  onExecute,
  onNavigate,
}: ContextualActionsProps) {
  const busy = advancing || executing;

  switch (status) {
    case 'SETUP':
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Crie as 4 lojas e aguarde os times entrarem antes de iniciar.
          </p>
          <Button className="w-full" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Iniciando...' : 'Iniciar 1ª Configuração →'}
          </Button>
        </div>
      );

    case 'ROUND_1_CONFIG':
      return (
        <div className="space-y-2">
          {allConfirmed ? (
            <p className="text-xs text-accent bg-accent/10 rounded px-2 py-1.5 border border-accent/20">
              Todas as lojas confirmaram o PO.
            </p>
          ) : (
            <p className="text-xs text-warning bg-warning/10 rounded px-2 py-1.5 border border-warning/20 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Aguardando confirmação de todos os POs...
            </p>
          )}
          <Button
            className="w-full shadow-sm hover:bg-accent/90"
            onClick={onAdvance}
            disabled={busy || !allConfirmed}
          >
            {advancing ? 'Iniciando...' : 'Iniciar Rodada 1 →'}
          </Button>
        </div>
      );

    case 'ROUND_1':
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Execute o motor de cálculo após todas as lojas confirmarem.
          </p>
          <Button className="w-full" onClick={onExecute} disabled={busy}>
            {executing ? 'Executando...' : 'Executar Rodada 1'}
          </Button>
          <Button className="w-full" variant="outline" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Avançando...' : 'Avançar para Reconfiguração →'}
          </Button>
        </div>
      );

    case 'RECONFIGURATION':
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Gerencie as transferências obrigatórias entre lojas.
          </p>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => onNavigate(`/dashboard/session/${sessionId}/transfers`)}
          >
            Gerenciar Transferências
          </Button>
          <Button className="w-full" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Iniciando...' : 'Iniciar 2ª Configuração →'}
          </Button>
        </div>
      );

    case 'ROUND_2':
      return (
        <div className="space-y-2">
          <Button className="w-full" onClick={onExecute} disabled={busy}>
            {executing ? 'Executando...' : 'Executar Rodada 2'}
          </Button>
          <Button className="w-full" variant="outline" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Avançando...' : 'Avançar para Rodada 3 →'}
          </Button>
        </div>
      );

    case 'ROUND_3':
      return (
        <div className="space-y-2">
          <Button className="w-full" onClick={onExecute} disabled={busy}>
            {executing ? 'Executando...' : 'Executar Rodada 3'}
          </Button>
          <Button className="w-full" variant="outline" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Finalizando...' : 'Finalizar Sessão →'}
          </Button>
        </div>
      );

    case 'FINISHED':
      return (
        <div className="space-y-2">
          <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1.5 border border-green-200">
            Sessão finalizada. Confira o placar final!
          </p>
          <Button
            className="w-full"
            onClick={() => onNavigate(`/session/${sessionId}/results`)}
          >
            Ver Resultado Final →
          </Button>
        </div>
      );
  }
}

// ── InfoTile ──────────────────────────────────────────────────────────────────

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="font-mono font-semibold text-sm">{value}</p>
    </div>
  );
}

// ── StoreCard ─────────────────────────────────────────────────────────────────

interface StoreCardProps {
  store: StoreStatus;
  initialCash: number;
  copiedCode: string | null;
  onCopy: (code: string) => void;
}

function StoreCard({ store, initialCash, copiedCode, onCopy }: StoreCardProps) {
  const ALL_ROLES: StoreRole[] = [
    'STORE_MANAGER',
    'SUPPLY_MANAGER',
    'COMMERCIAL_MANAGER',
    'OPERATIONAL_MANAGER',
    'SERVICE_MANAGER',
  ];

  const hasPlan = store.cashUsed > 0 || store.planConfirmed;
  const cashDanger = store.availableCash < 0;

  const borderClass = store.planConfirmed
    ? 'border-l-4 border-l-accent'
    : store.memberCount > 0
      ? 'border-l-4 border-l-warning'
      : 'border-l-4 border-l-muted';

  return (
    <Card className={borderClass}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-display font-semibold text-base">
            {store.storeName}
          </CardTitle>
          <Badge
            className={
              store.planConfirmed
                ? 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/10'
                : 'bg-warning/10 text-warning border border-warning/20 hover:bg-warning/10'
            }
            variant="outline"
          >
            {store.planConfirmed ? 'PO confirmado' : 'PO pendente'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Access code */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-widest bg-primary text-primary-foreground px-3 py-1 rounded-lg">
            {store.accessCode}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8"
            onClick={() => onCopy(store.accessCode)}
          >
            {copiedCode === store.accessCode ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>

        {/* Financial summary */}
        {hasPlan && (
          <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 rounded-md p-2.5">
            <div>
              <p className="text-muted-foreground mb-0.5">Caixa usado</p>
              <p className="font-mono font-semibold tabular-nums">{brl(store.cashUsed)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Disponível</p>
              <p className={`font-mono font-semibold tabular-nums ${cashDanger ? 'text-destructive' : ''}`}>
                {brl(store.availableCash)}
              </p>
            </div>
            {store.lastRoundEbitda !== null && store.lastRound !== null && (
              <div className="col-span-2 border-t pt-2 mt-0.5">
                <p className="text-muted-foreground mb-0.5">EBITDA R{store.lastRound}</p>
                <p
                  className={`font-mono font-semibold tabular-nums ${
                    (store.lastRoundEbitdaPct ?? 0) < 0 ? 'text-destructive' : 'text-accent'
                  }`}
                >
                  {brl(store.lastRoundEbitda)}{' '}
                  <span className="font-normal text-muted-foreground">
                    ({store.lastRoundEbitdaPct !== null ? pct(store.lastRoundEbitdaPct) : '—'})
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Members */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Membros ({store.memberCount}/5)
          </p>
          <div className="space-y-0.5">
            {ALL_ROLES.map((role) => {
              const member = store.members.find((m) => m.role === role);
              return (
                <div key={role} className="flex items-center justify-between text-sm py-0.5">
                  <span className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</span>
                  {member ? (
                    <span className="font-medium text-xs truncate max-w-[130px]">{member.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">vazio</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
