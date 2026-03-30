import AppShell from '@/components/layout/app-shell';
import { PlayerJoinBackLink } from '@/components/layout/player-join-back-link';

/** Rotas do jogador em `/store/*`: shell de jogador + link “voltar ao join”. */
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
