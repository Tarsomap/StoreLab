'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { WsStatusDot } from '@/components/layout/ws-status-dot';

type UserRole = 'FACILITATOR' | 'PLAYER';

interface AppShellProps {
  children: React.ReactNode;
  userRole?: UserRole;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="h-16 bg-primary text-primary-foreground flex items-center justify-between px-6 shrink-0">
        <span className="font-display font-semibold text-base tracking-tight">
          Store<span style={{ color: 'hsl(142 71% 45%)' }}>Lab</span>
        </span>
        <div className="flex items-center gap-3">
          <WsStatusDot />
          <span className="text-sm text-primary-foreground/70 hidden sm:block">
            {user?.name}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-primary-foreground/30 text-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={handleLogout}
          >
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-background p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
