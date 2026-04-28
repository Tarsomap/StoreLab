import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { PlanFullResponse } from '../types';

export function useSavePlan() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (path: string, body: unknown): Promise<PlanFullResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.put<PlanFullResponse>(path, body);
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao salvar';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
