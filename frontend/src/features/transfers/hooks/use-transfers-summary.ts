import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { TransferSessionSummary } from '../types';

export function useTransfersSummary(sessionId: string) {
  const [data, setData] = useState<TransferSessionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.get<TransferSessionSummary>(`/sessions/${sessionId}/transfers/summary`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar resumo de transferências');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, isLoading, error, refetch };
}
