import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { PlanFullResponse } from '../types';

interface CategoryDecisionParams {
  planId: string;
  categoryId: string;
  stockPurchased: number;
  priceMargin: number;
}

export function useSaveCategoryDecision() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (params: CategoryDecisionParams): Promise<PlanFullResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.put<PlanFullResponse>(`/plans/${params.planId}/category-decision`, {
        categoryId: params.categoryId,
        stockPurchased: params.stockPurchased,
        priceMargin: params.priceMargin,
      });
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao salvar decisão';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
