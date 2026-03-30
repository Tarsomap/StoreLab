'use client';

import { useSocketConnectionState } from '@/hooks/useSocket';

export function WsStatusDot() {
  const state = useSocketConnectionState();

  const label =
    state === 'connected'
      ? 'Tempo real conectado'
      : state === 'reconnecting'
        ? 'Reconectando…'
        : 'Tempo real desconectado';

  const dotClass =
    state === 'connected'
      ? 'bg-accent'
      : state === 'reconnecting'
        ? 'bg-warning animate-pulse'
        : 'bg-destructive';

  return (
    <span className="inline-flex items-center justify-center" title={label}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
