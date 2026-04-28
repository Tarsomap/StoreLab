import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface CreateTransferParams {
  sessionId: string;
  fromStoreId: string;
  toStoreId: string;
  userId: string;
}

export function useCreateTransfer() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (params: CreateTransferParams): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/sessions/${params.sessionId}/transfers`, {
        fromStoreId: params.fromStoreId,
        toStoreId: params.toStoreId,
        userId: params.userId,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao registrar transferência';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
