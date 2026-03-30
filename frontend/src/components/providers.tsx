'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

/**
 * Envolve cada página com uma `key` igual à rota atual para a animação CSS de entrada disparar de novo
 * quando o usuário navega — dá sensação de transição sem recarregar o site inteiro.
 *
 * @param children - Conteúdo da rota ativa.
 */
function PageEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-enter">
      {children}
    </div>
  );
}

/**
 * Provedores globais do cliente: animação de página + Sonner (mensagens tipo “salvo com sucesso”).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageEnter>{children}</PageEnter>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
