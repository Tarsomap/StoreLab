'use client';

/**
 * Fluxo do facilitador — Gestão de uma sessão (`/dashboard/session/[id]`):
 * 1) Carrega detalhe da sessão e GET `/sessions/:id/status` (lojas, POs confirmados, códigos, EBITDA último).
 * 2) Em SETUP pode criar lojas (POST `/stores`); vê stepper de fases e ações contextuais (avançar PATCH `/advance`, executar rodada POST `/execute`).
 * 3) Link para gerenciar quiz e, quando aplicável, bloco `SessionQuizProgress` (WebSocket + API de score por loja).
 * 4) Cards de loja com copiar código; reconfiguração lembra transferências (rota separada no app).
 */
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatBrl } from '@/lib/format-brl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Store } from 'lucide-react';
import { SessionSkeleton } from '@/components/skeletons/session-skeleton';
import { SessionQuizProgress } from '@/components/session/session-quiz-progress';
import { PhaseStepper } from '@/features/session/components/PhaseStepper';
import { ContextualActions } from '@/features/session/components/ContextualActions';
import { InfoTile } from '@/features/session/components/InfoTile';
import { StoreCard } from '@/features/session/components/StoreCard';
import { CreateStoreForm } from '@/features/session/components/CreateStoreForm';
import { useSession } from '@/features/session/hooks/use-session';
import { PHASE_LABEL, getActiveStepIndex, facilitatorQuizRound } from '@/features/session/lib/session-phases';
import { useAdvanceSession } from '@/features/session/hooks/use-advance-session';
import { useExecuteRound } from '@/features/session/hooks/use-execute-round';
import { useQuizRoundProgress } from '@/features/quiz/hooks/use-quiz-round-progress';
import { SessionActionsMenu } from '@/features/session/components/SessionActionsMenu';
import { SessionTimerCard } from '@/features/session/components/SessionTimerCard';
import { StoresReadyBanner } from '@/features/session/components/StoresReadyBanner';
import { useRealtimeStoreStatus } from '@/features/session/hooks/use-realtime-store-status';

export default function SessionManagementPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const { session, statusData, loading, error, refetch } = useSession(sessionId);
  const { mutate: advanceSession, isLoading: advancing, error: advanceError } = useAdvanceSession(sessionId);
  const { mutate: executeRound, isLoading: executing, error: executeError } = useExecuteRound(sessionId);
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const actionError = advanceError ?? executeError ?? '';

  const quizRound = session ? facilitatorQuizRound(session.status) : null;
  const { hasQuestions } = useQuizRoundProgress(sessionId, quizRound, session?.status ?? 'SETUP');
  const quizProgressRound = hasQuestions ? quizRound : null;

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useRealtimeStoreStatus(sessionId, refetch);

  async function handleAdvance() {
    try {
      await advanceSession();
      await refetch();
    } catch {
      // error exposed via advanceError from hook
    }
  }

  async function handleExecute() {
    try {
      await executeRound();
      await refetch();
    } catch {
      // error exposed via executeError from hook
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) return <SessionSkeleton />;

  if (error || !session || !statusData) {
    return (
      <div className="flex items-center justify-center py-32">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive">{error || 'Sessão não encontrada'}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>Voltar ao dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = session.status;
  const storeCount = statusData.stores.length;
  const confirmedCount = statusData.stores.filter((s) => s.planConfirmed).length;
  const allConfirmed = storeCount > 0 && confirmedCount === storeCount;
  const canCreateStore = status === 'SETUP' && storeCount < 4;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="text-muted-foreground px-0 hover:bg-transparent">
            ← Dashboard
          </Button>
          <span>/</span>
          <span className="font-medium text-foreground truncate max-w-[200px]">{session.name}</span>
        </div>
        <SessionActionsMenu
          session={session}
          onDeleted={() => router.push('/dashboard')}
          onUpdated={() => refetch()}
          align="end"
        />
      </div>

      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Fase atual</p>
              <h2 className="font-display text-lg font-bold text-foreground">{PHASE_LABEL[status]}</h2>
            </div>
            <span className="text-sm text-muted-foreground">{confirmedCount}/{storeCount} POs confirmados</span>
          </div>
          <Separator />
          <div className="pt-4"><PhaseStepper activeIndex={getActiveStepIndex(status)} /></div>
        </CardContent>
      </Card>

      <StoresReadyBanner stores={statusData.stores} status={status} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold font-display">Sessão</CardTitle>
          </CardHeader>
          <Separator className="my-3" />
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <InfoTile label="Demanda Total" value={session.totalDemand.toLocaleString('pt-BR')} />
              <InfoTile label="Caixa Inicial" value={formatBrl(session.initialCash)} />
              <InfoTile label="Lojas" value={`${storeCount} / 4`} />
              <InfoTile label="POs Confirmados" value={`${confirmedCount} / ${storeCount}`} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/session/${sessionId}/quiz`)}>
                Gerenciar Quiz
              </Button>
              {['ROUND_1', 'RECONFIGURATION', 'ROUND_2', 'ROUND_3', 'FINISHED'].includes(status) && (
                <Button size="sm" variant="outline" onClick={() => router.push(`/session/${sessionId}/results`)}>
                  Ver Resultados
                </Button>
              )}
              {['ROUND_1', 'RECONFIGURATION', 'ROUND_2', 'ROUND_3', 'FINISHED'].includes(status) && (
                <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/session/${sessionId}/report`)}>
                  Relatório Consolidado
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-0">
            <CardTitle className="font-display font-semibold text-sm uppercase tracking-wide">Ações</CardTitle>
          </CardHeader>
          <Separator className="my-3" />
          <CardContent className="space-y-3 pt-0">
            {actionError && <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">{actionError}</p>}
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

      {session.timerEnabled && (
        <SessionTimerCard session={session} onTimerChange={refetch} />
      )}

      {quizProgressRound !== null && storeCount > 0 && (
        <>
          <Separator />
          <SessionQuizProgress
            sessionId={sessionId}
            quizRound={quizProgressRound}
            stores={statusData.stores.map((s) => ({ storeId: s.storeId, storeName: s.storeName, memberCount: s.memberCount }))}
          />
        </>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">Lojas ({storeCount}/4)</h2>
          {canCreateStore && (
            <Button size="sm" variant="outline" onClick={() => setShowCreateStore((v) => !v)}>
              {showCreateStore ? 'Cancelar' : '+ Nova loja'}
            </Button>
          )}
        </div>

        {showCreateStore && (
          <CreateStoreForm
            sessionId={sessionId}
            onCreated={async () => { setShowCreateStore(false); await refetch(); }}
            onCancel={() => setShowCreateStore(false)}
          />
        )}

        {storeCount === 0 ? (
          <Card className="shadow-sm border">
            <CardContent className="py-12 px-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Store className="h-7 w-7" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="font-display text-base font-semibold text-foreground">Nenhuma loja criada ainda</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Crie até 4 lojas para gerar códigos de acesso e os times entrarem na partida.
                </p>
              </div>
              {canCreateStore && <Button type="button" size="sm" onClick={() => setShowCreateStore(true)}>+ Nova loja</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {statusData.stores.map((store) => (
              <StoreCard key={store.storeId} store={store} initialCash={session.initialCash} copiedCode={copiedCode} onCopy={copyCode} onDeleted={refetch} onUpdated={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
