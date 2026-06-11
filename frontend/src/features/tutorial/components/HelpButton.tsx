'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useTutorialStore } from '../store/tutorial-store';

export function HelpButton() {
  const pathname = usePathname();
  const { openTutorialA, openTutorialB, openTutorialC, openTutorialD } = useTutorialStore();

  const isJoinPage = pathname === '/join';
  const isPlanPage = /^\/store\/[^/]+\/plan/.test(pathname);
  const isDashboardPage = pathname === '/dashboard';
  const isSessionPage = /^\/dashboard\/session\/[^/]+$/.test(pathname);

  if (!isJoinPage && !isPlanPage && !isDashboardPage && !isSessionPage) return null;

  function handleClick() {
    if (isJoinPage) openTutorialA();
    else if (isPlanPage) openTutorialB();
    else if (isDashboardPage) openTutorialC();
    else openTutorialD();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="border-primary-foreground/30 text-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground gap-1.5 rounded-xl"
      aria-label="Ajuda / Tutorial"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden sm:inline text-xs">Ajuda</span>
    </Button>
  );
}
