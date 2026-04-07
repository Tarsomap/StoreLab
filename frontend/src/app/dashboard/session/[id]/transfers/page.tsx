'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

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
  members: StoreMember[];
}

interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  stores: StoreStatus[];
}

interface TransferSummaryEntry {
  storeId: string;
  storeName: string;
  outboundTransfers: number;
  minimumRequired: number;
  maximumAllowed: number;
  requirementMet: boolean;
}

interface TransferSessionSummary {
  sessionId: string;
  canAdvanceToRound2: boolean;
  stores: TransferSummaryEntry[];
}

const ROLE_LABELS: Record<StoreRole, string> = {
  STORE_MANAGER: 'Gerente da Loja',
  SUPPLY_MANAGER: 'Abastecimento',
  COMMERCIAL_MANAGER: 'Comercial',
  OPERATIONAL_MANAGER: 'Operacional',
  SERVICE_MANAGER: 'Serviços',
};

export default function SessionTransfersPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  const [statusData, setStatusData] = useState<SessionStatusResponse | null>(null);
  const [summary, setSummary] = useState<TransferSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [sourceStoreId, setSourceStoreId] = useState('');
  const [userId, setUserId] = useState('');
  const [targetStoreId, setTargetStoreId] = useState('');

  async function fetchData() {
    setError('');
    try {
      const [statusRes, summaryRes] = await Promise.all([
        api.get<SessionStatusResponse>(`/sessions/${sessionId}/status`),
        api.get<TransferSessionSummary>(`/sessions/${sessionId}/transfers/summary`),
      ]);
      setStatusData(statusRes);
      setSummary(summaryRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar transferências');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const sourceStore = useMemo(
    () => statusData?.stores.find((store) => store.storeId === sourceStoreId) ?? null,
    [statusData, sourceStoreId],
  );

  const transferableMembers = useMemo(
    () => sourceStore?.members.filter((member) => member.role !== 'STORE_MANAGER') ?? [],
    [sourceStore],
  );

  const selectedMember = useMemo(
    () => transferableMembers.find((member) => member.userId === userId) ?? null,
    [transferableMembers, userId],
  );

  const availableTargets = useMemo(() => {
    if (!statusData || !selectedMember || !sourceStoreId) return [];
    return statusData.stores.filter((store) => {
      if (store.storeId === sourceStoreId) return false;
      const sameRoleExists = store.members.some((member) => member.role === selectedMember.role);
      return !sameRoleExists;
    });
  }, [statusData, selectedMember, sourceStoreId]);

  async function handleTransfer() {
    if (!sourceStoreId || !userId || !targetStoreId) {
      setActionError('Selecione loja de origem, jogador e loja de destino.');
      return;
    }

    setActionError('');
    setSubmitting(true);
    try {
      await api.post(`/sessions/${sessionId}/transfers`, {
        fromStoreId: sourceStoreId,
        toStoreId: targetStoreId,
        userId,
      });
      setUserId('');
      setTargetStoreId('');
      await fetchData();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao registrar transferência');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto py-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (error || !statusData || !summary) {
    return (
      <div className="max-w-5xl mx-auto py-6">
        <p className="text-sm text-destructive">{error || 'Não foi possível carregar dados da sessão.'}</p>
        <Button variant="outline" className="mt-3" onClick={() => router.push(`/dashboard/session/${sessionId}`)}>
          Voltar para sessão
        </Button>
      </div>
    );
  }

  const canTransfer = statusData.status === 'RECONFIGURATION';

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Transferências</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Regra obrigatória: cada loja deve ter 1 a 2 transferências de saída.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/dashboard/session/${sessionId}`)}>
          Voltar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Status da Regra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                summary.canAdvanceToRound2
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'border-warning/30 bg-warning/10 text-warning'
              }
            >
              {summary.canAdvanceToRound2 ? 'Pronto para avançar para Rodada 2' : 'Ainda pendente'}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.stores.map((store) => (
              <div key={store.storeId} className="rounded-xl border p-3">
                <p className="font-display font-semibold text-sm text-foreground">{store.storeName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Saídas: <span className="font-mono text-foreground">{store.outboundTransfers}</span> / {store.minimumRequired}-{store.maximumAllowed}
                </p>
                <Badge
                  variant="outline"
                  className={`mt-2 ${
                    store.requirementMet
                      ? 'border-accent/30 bg-accent/10 text-accent'
                      : 'border-destructive/30 bg-destructive/10 text-destructive'
                  }`}
                >
                  {store.requirementMet ? 'Concluído' : 'Pendente'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Nova Transferência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canTransfer && (
            <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
              Transferências só podem ser feitas no status RECONFIGURATION.
            </p>
          )}

          {actionError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {actionError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Loja de origem</Label>
              <Select
                value={sourceStoreId}
                onValueChange={(value) => {
                  setSourceStoreId(value);
                  setUserId('');
                  setTargetStoreId('');
                }}
                disabled={!canTransfer || submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {statusData.stores.map((store) => (
                    <SelectItem key={store.storeId} value={store.storeId}>
                      {store.storeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jogador</Label>
              <Select
                value={userId}
                onValueChange={(value) => {
                  setUserId(value);
                  setTargetStoreId('');
                }}
                disabled={!canTransfer || submitting || !sourceStore}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {transferableMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name} ({ROLE_LABELS[member.role]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Loja de destino</Label>
              <Select
                value={targetStoreId}
                onValueChange={setTargetStoreId}
                disabled={!canTransfer || submitting || !selectedMember}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {availableTargets.map((store) => (
                    <SelectItem key={store.storeId} value={store.storeId}>
                      {store.storeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <Button onClick={handleTransfer} disabled={!canTransfer || submitting}>
            {submitting ? 'Transferindo...' : 'Confirmar Transferência'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
