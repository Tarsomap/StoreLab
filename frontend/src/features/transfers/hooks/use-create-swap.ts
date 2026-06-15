import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface CreateSwapParams {
  sessionId: string;
  userAId: string;
  userBId: string;
}

/**
 * Troca recíproca de dois jogadores de mesmo papel entre lojas diferentes (caso de lojas cheias).
 * Espelha o padrão de `useCreateTransfer`, mas chama o endpoint dedicado `POST /sessions/:id/swaps`,
 * que move os dois ao mesmo tempo sem esbarrar no papel já ocupado no destino.
 */
export function useCreateSwap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (params: CreateSwapParams): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/sessions/${params.sessionId}/swaps`, {
        userAId: params.userAId,
        userBId: params.userBId,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao registrar troca';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
