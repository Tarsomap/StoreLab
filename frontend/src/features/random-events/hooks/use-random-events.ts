'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { RandomEventsPayload } from '../types';

export function useRandomEvents(sessionId: string, storeId: string) {
  const { on } = useSocket(sessionId, storeId);
  const [pendingPayload, setPendingPayload] = useState<RandomEventsPayload | null>(null);

  useEffect(() => {
    return on<RandomEventsPayload>('random:events', (payload) => {
      if (payload.events.length > 0) {
        setPendingPayload(payload);
      }
    });
  }, [on]);

  const dismiss = () => setPendingPayload(null);

  return { pendingPayload, dismiss };
}
