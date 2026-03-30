import AppShell from '@/components/layout/app-shell';

/** Página de entrada na loja com mesma TopBar do jogador (sem sidebar). */
export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell userRole="PLAYER">{children}</AppShell>;
}
