import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Session, UpdateSessionInput } from '../types';

export function useUpdateSession(sessionId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (input: UpdateSessionInput): Promise<Session> => {
    setIsLoading(true);
    setError(null);
    try {
      return await api.patch<Session>(`/sessions/${sessionId}`, input);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao atualizar sessão';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
