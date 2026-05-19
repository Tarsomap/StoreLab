'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

export function useSessionTimer(sessionId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(path: string): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      await api.patch(`/sessions/${sessionId}/timer/${path}`, {});
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro no timer';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    start: () => action('start'),
    pause: () => action('pause'),
    stop: () => action('stop'),
    isLoading,
    error,
  };
}
