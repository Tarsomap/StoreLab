'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSessionStatus } from '@/features/transfers/hooks/use-session-status';
import { useTransfersSummary } from '@/features/transfers/hooks/use-transfers-summary';
import { useCreateTransfer } from '@/features/transfers/hooks/use-create-transfer';
import { TransferSummaryCard } from '@/features/transfers/components/TransferSummaryCard';
import { TransferForm } from '@/features/transfers/components/TransferForm';

export default function SessionTransfersPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  const { data: statusData, isLoading: loadingStatus, error: statusError, refetch: refetchStatus } =
    useSessionStatus(sessionId);
  const { data: summary, isLoading: loadingSummary, error: summaryError, refetch: refetchSummary } =
    useTransfersSummary(sessionId);
  const { mutate: createTransfer, isLoading: submitting, error: transferError } = useCreateTransfer();

  const [sourceStoreId, setSourceStoreId] = useState('');
  const [userId, setUserId] = useState('');
  const [targetStoreId, setTargetStoreId] = useState('');

  const loading = loadingStatus || loadingSummary;
  const error = statusError ?? summaryError ?? '';

  const sourceStore = useMemo(
    () => statusData?.stores.find((s) => s.storeId === sourceStoreId) ?? null,
    [statusData, sourceStoreId],
  );

  const transferableMembers = useMemo(
    () => sourceStore?.members.filter((m) => m.role !== 'STORE_MANAGER') ?? [],
    [sourceStore],
  );

  const selectedMember = useMemo(
    () => transferableMembers.find((m) => m.userId === userId) ?? null,
    [transferableMembers, userId],
  );

  const availableTargets = useMemo(() => {
    if (!statusData || !selectedMember || !sourceStoreId) return [];
    return statusData.stores.filter((store) => {
      if (store.storeId === sourceStoreId) return false;
      return !store.members.some((m) => m.role === selectedMember.role);
    });
  }, [statusData, selectedMember, sourceStoreId]);

  async function handleTransfer() {
    if (!sourceStoreId || !userId || !targetStoreId) return;
    try {
      await createTransfer({ sessionId, fromStoreId: sourceStoreId, toStoreId: targetStoreId, userId });
      setUserId('');
      setTargetStoreId('');
      await Promise.all([refetchStatus(), refetchSummary()]);
    } catch {
      // error exposed via transferError from hook
    }
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto py-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (error || !statusData || !summary) {
    return (
      <div className="max-w-5xl mx-auto py-6">
        <p className="text-sm text-destructive">{error || 'Não foi possível carregar dados da sessão.'}</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => router.push(`/dashboard/session/${sessionId}`)}
        >
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

      <TransferSummaryCard summary={summary} />

      <TransferForm
        stores={statusData.stores}
        sourceStoreId={sourceStoreId}
        userId={userId}
        targetStoreId={targetStoreId}
        transferableMembers={transferableMembers}
        availableTargets={availableTargets}
        canTransfer={canTransfer}
        submitting={submitting}
        actionError={transferError}
        onSourceChange={(v) => { setSourceStoreId(v); setUserId(''); setTargetStoreId(''); }}
        onUserChange={(v) => { setUserId(v); setTargetStoreId(''); }}
        onTargetChange={setTargetStoreId}
        onTransfer={handleTransfer}
      />
    </div>
  );
}
