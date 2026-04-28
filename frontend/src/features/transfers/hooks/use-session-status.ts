import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SessionStatusResponse } from '../types';

export function useSessionStatus(sessionId: string) {
  const [data, setData] = useState<SessionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.get<SessionStatusResponse>(`/sessions/${sessionId}/status`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar status da sessão');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, isLoading, error, refetch };
}
