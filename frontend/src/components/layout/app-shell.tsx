'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

type UserRole = 'FACILITATOR' | 'PLAYER';

interface AppShellProps {
  children: React.ReactNode;
  userRole?: UserRole;
}

const NAV_LINKS = [{ label: 'Dashboard', href: '/dashboard' }];

export default function AppShell({ children, userRole }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const showSidebar = userRole === 'FACILITATOR';

  return (
    <div className="flex flex-col min-h-screen">
      {/* TopBar */}
      <header className="h-16 bg-primary text-primary-foreground flex items-center justify-between px-6 shrink-0">
        <span className="font-display font-semibold text-base tracking-tight">
          Retail Game Platform
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-primary-foreground/70 hidden sm:block">
            {user?.name}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={handleLogout}
          >
            Sair
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — FACILITATOR only */}
        {showSidebar && (
          <aside className="w-[260px] bg-card border-r shrink-0 py-6 px-4">
            <nav className="space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </aside>
        )}

        {/* Content */}
        <div className="flex-1 bg-background p-8 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
