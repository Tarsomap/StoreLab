'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

function PageEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-enter">
      {children}
    </div>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageEnter>{children}</PageEnter>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
