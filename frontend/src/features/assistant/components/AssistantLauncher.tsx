'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssistantChat } from '../hooks/use-assistant-chat';
import type { AssistantContext } from '../types';
import { AssistantPanel } from './AssistantPanel';

function getAssistantContext(pathname: string): AssistantContext {
  const dashboardSessionMatch = pathname.match(/^\/dashboard\/session\/([^/]+)/);
  if (dashboardSessionMatch) return { sessionId: dashboardSessionMatch[1] };

  const storeMatch = pathname.match(/^\/store\/([^/]+)\/(?:plan|quiz)/);
  if (storeMatch) return { storeId: storeMatch[1] };

  const resultsMatch = pathname.match(/^\/session\/([^/]+)\/results/);
  if (resultsMatch) return { sessionId: resultsMatch[1] };

  return {};
}

export function AssistantLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const context = useMemo(() => getAssistantContext(pathname), [pathname]);
  const { messages, isLoading, error, ask, retry, reset } = useAssistantChat(context);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[70] h-12 w-12 rounded-xl shadow-lg sm:bottom-6 sm:right-6"
        aria-label="Abrir assistente StoreLab"
      >
        <span className="relative">
          <MessageCircle className="h-5 w-5" aria-hidden />
          <Bot className="absolute -right-1.5 -top-1.5 h-3 w-3 text-accent" aria-hidden />
        </span>
      </Button>

      <AssistantPanel
        open={open}
        messages={messages}
        isLoading={isLoading}
        error={error}
        onClose={() => setOpen(false)}
        onAsk={ask}
        onRetry={retry}
        onReset={reset}
      />
    </>,
    document.body,
  );
}
