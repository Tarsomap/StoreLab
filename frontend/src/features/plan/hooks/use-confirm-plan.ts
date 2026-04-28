import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { PlanFullResponse } from '../types';

export function useConfirmPlan() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (planId: string): Promise<PlanFullResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.post<PlanFullResponse>(`/plans/${planId}/confirm`, {});
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao confirmar PO';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
