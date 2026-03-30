import AppShell from '@/components/layout/app-shell';

/** Resultados da partida com navegação de jogador autenticado. */
export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell userRole="PLAYER">{children}</AppShell>;
}
