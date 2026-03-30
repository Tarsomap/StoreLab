import AppShell from '@/components/layout/app-shell';

/** Envolve rotas `/dashboard/*` com shell de facilitador (TopBar + sidebar quando dentro de uma sessão). */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell userRole="FACILITATOR">{children}</AppShell>;
}
