'use client';

import { useSessionsList } from '@/features/session/hooks/use-sessions-list';
import { ActivityLogsSection } from '@/features/auth/components/ActivityLogsSection';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';

export default function LogsPage() {
  const { sessions, loading } = useSessionsList();

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-6 sm:px-6 lg:px-0">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Logs de Atividade</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Histórico de autenticação dos jogadores por sessão e loja
        </p>
      </div>

      <ActivityLogsSection sessions={sessions.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
