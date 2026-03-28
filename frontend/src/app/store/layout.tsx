import AppShell from '@/components/layout/app-shell';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell userRole="PLAYER">{children}</AppShell>;
}
