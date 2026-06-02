'use client';

/**
 * Fluxo do facilitador — Dashboard (`/dashboard`):
 * 1) Ao abrir, GET `/sessions` lista todas as partidas dele; enquanto carrega mostra esqueleto.
 * 2) Pode criar sessão (POST `/sessions`) — nome, demanda, caixa; nova sessão aparece no topo da lista.
 * 3) Vê KPIs, destaque da primeira sessão ativa, grade de sessões ativas (clique vai para `/dashboard/session/[id]`).
 * 4) Sessões finalizadas alimentam gráfico de EBITDA % (GET `/results/:id/ranking`) e tabela "Histórico" com link para resultados públicos.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { SessionStatusBadge, SESSION_STATUS_LABEL } from '@/components/session-status-badge';
import { useSessionsList } from '@/features/session/hooks/use-sessions-list';
import { CreateSessionForm } from '@/features/session/components/CreateSessionForm';
import { SessionKpiCards } from '@/features/session/components/SessionKpiCards';
import { HistoricPerformanceSection } from '@/features/session/components/HistoricPerformanceSection';
import { SessionHistoryTable } from '@/features/session/components/SessionHistoryTable';
import { SessionActionsMenu } from '@/features/session/components/SessionActionsMenu';
import { formatBrl } from '@/lib/format-brl';
import {
  sumTrainedStoresForFinished,
  formatConfirmedStores,
  STATUS_PROGRESS,
} from '@/features/session/lib/session-phases';
import type { Session } from '@/features/session/types';

export default function DashboardPage() {
  const router = useRouter();
  const {
    sessions,
    loading,
    categoryCatalog,
    capexCatalog,
    categoryConfigs,
    capexConfigs,
    setCategoryConfigs,
    setCapexConfigs,
    addSession,
    removeSession,
    updateSession,
  } = useSessionsList();
  const [showCreate, setShowCreate] = useState(false);

  const { activeSessions, finishedSessions, kpi, featuredSession } = useMemo(() => {
    const active = sessions.filter((s) => s.status !== 'FINISHED');
    const finished = sessions
      .filter((s) => s.status === 'FINISHED')
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = sessions.length;
    const finishedCount = finished.length;
    const trainedStores = sumTrainedStoresForFinished(finished);
    const completionPct = total === 0 ? 0 : Math.round((finishedCount / total) * 100);
    return {
      activeSessions: active,
      finishedSessions: finished,
      kpi: { total, activeCount: active.length, trainedStores, completionPct },
      featuredSession: active.length > 0 ? active[0] : null,
    };
  }, [sessions]);

  if (loading) return <DashboardSkeleton />;

  function handleUpdated(updated: Session) {
    updateSession(updated);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-6 sm:px-6 lg:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Minhas Sessões</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as sessões de jogo</p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} className="w-full sm:w-auto">
          {showCreate ? 'Cancelar' : <><Plus className="h-4 w-4 mr-2" />Nova sessão</>}
        </Button>
      </div>

      {showCreate && (
        <CreateSessionForm
          categoryCatalog={categoryCatalog}
          capexCatalog={capexCatalog}
          categoryConfigs={categoryConfigs}
          capexConfigs={capexConfigs}
          onCategoryConfigChange={(id, field, value) =>
            setCategoryConfigs((prev) => ({
              ...prev,
              [id]: {
                ...prev[id],
                [field]: value,
              },
            }))
          }
          onCapexConfigChange={(id, field, value) =>
            setCapexConfigs((prev) => ({
              ...prev,
              [id]: {
                ...prev[id],
                [field]: value,
              },
            }))
          }
          onCreated={(session) => {
            addSession(session);
            setShowCreate(false);
            setCategoryConfigs(
              Object.fromEntries(
                categoryCatalog.map((c) => [
                  c.id,
                  {
                    stockAvailable: String(c.stockAvailable),
                    unitCost: String(c.unitCost),
                    taxRate: String(c.taxRate * 100),
                    breakageRate: String(c.breakageRate * 100),
                    agingRate: String(c.agingRate * 100),
                  },
                ]),
              ),
            );
            setCapexConfigs(
              Object.fromEntries(
                capexCatalog.map((c) => [
                  c.id,
                  {
                    acquisitionCost: String(c.acquisitionCost),
                    downtimeFixedDays: String(c.downtimeFixedDays),
                    monthlyLicenseDelta: String(c.monthlyLicenseDelta),
                    maintenanceSaving: String(c.maintenanceSaving),
                    slaRiskPercent: String(c.slaRiskPercent * 100),
                  },
                ]),
              ),
            );
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <SessionKpiCards kpi={kpi} />

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
            <Button type="button" onClick={() => setShowCreate(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />Nova sessão
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
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      className="w-full shrink-0 sm:w-auto rounded-xl"
                      onClick={() => router.push(`/dashboard/session/${featuredSession.id}`)}
                    >
                      Acompanhar sessão →
                    </Button>
                    <div onClick={(e) => e.stopPropagation()}>
                      <SessionActionsMenu
                        session={featuredSession}
                        onDeleted={() => removeSession(featuredSession.id)}
                        onUpdated={handleUpdated}
                      />
                    </div>
                  </div>
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
            <h3 id="active-sessions-heading" className="font-display text-xl font-bold text-foreground">
              Sessões Ativas
            </h3>
            {activeSessions.length === 0 ? (
              <Card className="shadow-sm border transition-colors duration-200 hover:shadow-md">
                <CardContent className="py-16 px-6 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <LayoutDashboard className="h-7 w-7" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-base font-semibold text-foreground">Nenhuma sessão ativa</p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Não há sessões em andamento. Crie uma nova ou consulte o histórico abaixo.
                    </p>
                  </div>
                  <Button type="button" onClick={() => setShowCreate(true)} className="rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />Nova sessão
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeSessions.map((s) => (
                  <Card
                    key={s.id}
                    className="cursor-pointer shadow-sm border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                    onClick={() => router.push(`/dashboard/session/${s.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col items-start gap-2 min-w-0">
                          <CardTitle className="font-display font-semibold text-base leading-tight">{s.name}</CardTitle>
                          <SessionStatusBadge status={s.status} />
                        </div>
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                          <SessionActionsMenu
                            session={s}
                            onDeleted={() => removeSession(s.id)}
                            onUpdated={handleUpdated}
                          />
                        </div>
                      </div>
                      <CardDescription className="mt-1 text-sm text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="text-sm text-muted-foreground space-y-1 pt-4">
                      <p>Demanda:{' '}<span className="font-mono font-medium text-foreground">{s.totalDemand.toLocaleString('pt-BR')}</span></p>
                      <p>Caixa:{' '}<span className="font-mono font-medium text-foreground">{formatBrl(s.initialCash)}</span></p>
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
            <h3 id="history-heading" className="font-display text-xl font-bold text-foreground">Histórico</h3>
            <SessionHistoryTable
              finishedSessions={finishedSessions}
              onDeleted={removeSession}
              onUpdated={handleUpdated}
            />
          </section>

        </div>
      )}
    </div>
  );
}
