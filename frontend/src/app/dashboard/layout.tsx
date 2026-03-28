import AppShell from '@/components/layout/app-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell userRole="FACILITATOR">{children}</AppShell>;
}
