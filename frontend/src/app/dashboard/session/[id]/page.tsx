'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

const STATUS_LABEL: Record<SessionStatus, string> = {
  SETUP: 'Configuração',
  ROUND_1_CONFIG: 'Config. Rodada 1',
  ROUND_1: 'Rodada 1',
  RECONFIGURATION: 'Reconfiguração',
  ROUND_2: 'Rodada 2',
  ROUND_3: 'Rodada 3',
  FINISHED: 'Finalizada',
};

const STATUS_COLOR: Record<SessionStatus, string> = {
  SETUP: 'bg-secondary text-secondary-foreground',
  ROUND_1_CONFIG: 'bg-yellow-100 text-yellow-800',
  ROUND_1: 'bg-blue-100 text-blue-800',
  RECONFIGURATION: 'bg-orange-100 text-orange-800',
  ROUND_2: 'bg-blue-100 text-blue-800',
  ROUND_3: 'bg-purple-100 text-purple-800',
  FINISHED: 'bg-green-100 text-green-800',
};

const ROLE_LABELS: Record<StoreRole, string> = {
  STORE_MANAGER: 'Gerente da Loja',
  SUPPLY_MANAGER: 'Abastecimento',
  COMMERCIAL_MANAGER: 'Comercial',
  OPERATIONAL_MANAGER: 'Operacional',
  SERVICE_MANAGER: 'Serviços',
};

const EXECUTABLE_STATUSES: SessionStatus[] = ['ROUND_1', 'ROUND_2', 'ROUND_3'];
const HAS_RESULTS_STATUSES: SessionStatus[] = [
  'ROUND_1',
  'RECONFIGURATION',
  'ROUND_2',
  'ROUND_3',
  'FINISHED',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionManagementPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Data
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [statusData, setStatusData] = useState<SessionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create store form
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);
  const [createStoreError, setCreateStoreError] = useState('');

  // Action states
  const [advancing, setAdvancing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Copied code tracking
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  function handleLogout() {
    logout();
    router.push('/login');
  }

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
      setCreateStoreError(
        err instanceof ApiError ? err.message : 'Erro ao criar loja',
      );
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
      setActionError(
        err instanceof ApiError ? err.message : 'Erro ao avançar rodada',
      );
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
      setActionError(
        err instanceof ApiError ? err.message : 'Erro ao executar rodada',
      );
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
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando sessão...</p>
      </div>
    );
  }

  if (error || !session || !statusData) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
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
  const canExecute = EXECUTABLE_STATUSES.includes(status);
  const hasResults = HAS_RESULTS_STATUSES.includes(status);
  const storeCount = statusData.stores.length;
  const canCreateStore = storeCount < 4;

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-muted-foreground"
            >
              ← Dashboard
            </Button>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-base font-semibold truncate max-w-[200px]">
              {session.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {mounted ? user?.name : null}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Session Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{session.name}</CardTitle>
                <CardDescription className="mt-1">
                  ID: <span className="font-mono text-xs">{session.id}</span>
                </CardDescription>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_COLOR[status]}`}
              >
                {STATUS_LABEL[status]}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  Demanda Total
                </p>
                <p className="font-semibold">{session.totalDemand.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  Caixa Inicial
                </p>
                <p className="font-semibold">
                  R$ {session.initialCash.toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  Lojas
                </p>
                <p className="font-semibold">{storeCount} / 4</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  POs confirmados
                </p>
                <p className="font-semibold">
                  {statusData.stores.filter((s) => s.planConfirmed).length} / {storeCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {actionError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
            {actionError}
          </p>
        )}
        <div className="flex flex-wrap gap-3 items-center">
          {status !== 'FINISHED' && (
            <Button onClick={handleAdvance} disabled={advancing || executing}>
              {advancing ? 'Avançando...' : 'Avançar rodada →'}
            </Button>
          )}
          {canExecute && (
            <Button
              variant="secondary"
              onClick={handleExecute}
              disabled={advancing || executing}
            >
              {executing ? 'Executando...' : `Executar ${STATUS_LABEL[status]}`}
            </Button>
          )}
          {hasResults && (
            <Button
              variant="outline"
              onClick={() => router.push(`/session/${sessionId}/results`)}
            >
              Ver resultados
            </Button>
          )}
        </div>

        {/* Stores Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lojas</h2>
            {canCreateStore && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateStore((v) => !v)}
              >
                {showCreateStore ? 'Cancelar' : '+ Nova loja'}
              </Button>
            )}
          </div>

          {/* Create store form */}
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

          {/* Store cards */}
          {statusData.stores.length === 0 ? (
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
                  copiedCode={copiedCode}
                  onCopy={copyCode}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── StoreCard ─────────────────────────────────────────────────────────────────

interface StoreCardProps {
  store: StoreStatus;
  copiedCode: string | null;
  onCopy: (code: string) => void;
}

function StoreCard({ store, copiedCode, onCopy }: StoreCardProps) {
  const ALL_ROLES: StoreRole[] = [
    'STORE_MANAGER',
    'SUPPLY_MANAGER',
    'COMMERCIAL_MANAGER',
    'OPERATIONAL_MANAGER',
    'SERVICE_MANAGER',
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{store.storeName}</CardTitle>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              store.planConfirmed
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {store.planConfirmed ? 'PO confirmado' : 'PO pendente'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Access code */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-widest bg-muted px-3 py-1 rounded">
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

        {/* Members */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Membros ({store.memberCount}/5)
          </p>
          <div className="space-y-0.5">
            {ALL_ROLES.map((role) => {
              const member = store.members.find((m) => m.role === role);
              return (
                <div
                  key={role}
                  className="flex items-center justify-between text-sm py-0.5"
                >
                  <span className="text-muted-foreground text-xs">
                    {ROLE_LABELS[role]}
                  </span>
                  {member ? (
                    <span className="font-medium text-xs truncate max-w-[130px]">
                      {member.name}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      vazio
                    </span>
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
