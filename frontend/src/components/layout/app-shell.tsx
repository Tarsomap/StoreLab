'use client';

/**
 * Casca visual do app: barra superior fixa (marca, ponto de WebSocket, nome, sair) e, para facilitador, sidebar contextual.
 * Busca nome da sessão quando a URL é `/dashboard/session/[id]/...` para mostrar no menu lateral.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { LayoutDashboard, Store, BookOpen, ArrowLeft, Menu, X } from 'lucide-react';
import { WsStatusDot } from '@/components/layout/ws-status-dot';

type UserRole = 'FACILITATOR' | 'PLAYER';

interface AppShellProps {
  children: React.ReactNode;
  userRole?: UserRole;
}

/** Lê o id da sessão na rota do dashboard para carregar o título da partida na sidebar. */
function extractSessionId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/session\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * @param children - Conteúdo da página atual (área principal com fundo `background`).
 * @param userRole - Se `FACILITATOR`, exibe sidebar; jogador fica só com TopBar e conteúdo full width.
 */
export default function AppShell({ children, userRole }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sessionId = extractSessionId(pathname);

  useEffect(() => {
    if (sessionId) {
      api
        .get<{ id: string; name: string }>(`/sessions/${sessionId}`)
        .then((s) => setSessionName(s.name))
        .catch(() => setSessionName(null));
    } else {
      setSessionName(null);
    }
  }, [sessionId]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const showSidebar = userRole === 'FACILITATOR';

  function navLinkClass(active: boolean) {
    return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
      active
        ? 'bg-muted text-foreground font-medium'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* TopBar */}
      <header className="h-16 bg-primary text-primary-foreground flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          {showSidebar && (
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="block p-1 hover:bg-primary-foreground/10 rounded transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <span className="font-display font-semibold text-base tracking-tight">
            Store<span style={{ color: 'hsl(142 71% 45%)' }}>Lab</span>
          </span>
        </div>
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



      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {showSidebar && isSidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden transition-opacity" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar — FACILITATOR only */}
        {showSidebar && (
          <aside 
            className={`fixed inset-y-0 left-0 z-50 shrink-0 bg-card py-6 lg:static transition-all duration-300 overflow-hidden flex flex-col ${
              isSidebarOpen ? 'w-[260px] px-4 border-r shadow-2xl lg:shadow-none' : 'w-0 px-0 border-none'
            }`}
          >
            <div className="min-w-[228px] flex-1">
              {/* Mobile Sidebar Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b lg:hidden">
                <span className="font-display font-semibold text-base tracking-tight text-foreground">
                  Store<span style={{ color: 'hsl(142 71% 45%)' }}>Lab</span>
                </span>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {sessionId ? (
                <nav className="space-y-1">
                  {/* Session header */}
                  <div className="px-3 pb-3 mb-2 border-b">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Sessão
                    </p>
                    <p className="font-display font-semibold text-sm truncate text-foreground">
                      {sessionName ?? '...'}
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/session/${sessionId}`}
                    className={navLinkClass(pathname === `/dashboard/session/${sessionId}`)}
                  >
                    <Store className="h-4 w-4 shrink-0" />
                    Lojas
                  </Link>

                  <Link
                    href={`/dashboard/session/${sessionId}/quiz`}
                    className={navLinkClass(pathname.startsWith(`/dashboard/session/${sessionId}/quiz`))}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    Quiz
                  </Link>

                  {/* Back to Dashboard */}
                  <div className="pt-2 mt-2 border-t">
                    <Link href="/dashboard" className={navLinkClass(false)}>
                      <ArrowLeft className="h-4 w-4 shrink-0" />
                      Voltar ao Dashboard
                    </Link>
                  </div>
                </nav>
              ) : (
                <nav className="space-y-1">
                  <Link
                    href="/dashboard"
                    className={navLinkClass(pathname === '/dashboard' || pathname.startsWith('/dashboard/'))}
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    Dashboard
                  </Link>
                </nav>
              )}
            </div>
          </aside>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto bg-background p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
