import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

export function useAdvanceSession(sessionId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.patch(`/sessions/${sessionId}/advance`, {});
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao avançar fase';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
