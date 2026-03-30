import AppShell from '@/components/layout/app-shell';
import { PlayerJoinBackLink } from '@/components/layout/player-join-back-link';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell userRole="PLAYER">
      <PlayerJoinBackLink />
      {children}
    </AppShell>
  );
}
