import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Store, UpdateStoreInput } from '../types';

export function useUpdateStore(storeId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (input: UpdateStoreInput): Promise<Store> => {
    setIsLoading(true);
    setError(null);
    try {
      return await api.patch<Store>(`/stores/${storeId}`, input);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao atualizar loja';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
