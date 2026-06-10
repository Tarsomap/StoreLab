'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';

export function useRealtimeStoreStatus(sessionId: string, onStoreConfirmed: () => void) {
  const { on } = useSocket(sessionId);

  const stableCallback = useCallback(() => {
    onStoreConfirmed();
  }, [onStoreConfirmed]);

  useEffect(() => {
    return on<{ storeId: string }>('store:confirmed', stableCallback);
  }, [on, stableCallback]);
}
