import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

export function useDeleteStore(storeId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.delete<{ deleted: true }>(`/stores/${storeId}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao excluir loja';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
