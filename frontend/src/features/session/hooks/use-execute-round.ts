import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

export function useExecuteRound(sessionId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/sessions/${sessionId}/execute`, {});
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao executar rodada';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
