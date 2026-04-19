'use client';
import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { StockAvailabilityEntry } from '../types';

export interface UseStockAvailabilityResult {
  stockAvailMap: Map<string, StockAvailabilityEntry>;
  fetchStockAvailability: (sessionId: string, configVersion: number) => Promise<void>;
}

/**
 * Gerencia o pool de estoque compartilhado da sessão para a versão de configuração atual.
 * Deve ser chamado após o plano ser carregado (para ter sessionId e configVersion)
 * e novamente após cada decisão de categoria (stockPurchased muda o remaining das outras lojas).
 */
export function useStockAvailability(): UseStockAvailabilityResult {
  const [stockAvailMap, setStockAvailMap] = useState<Map<string, StockAvailabilityEntry>>(
    new Map(),
  );

  const fetchStockAvailability = useCallback(async (sessionId: string, configVersion: number) => {
    try {
      const data = await api.get<StockAvailabilityEntry[]>(
        `/sessions/${sessionId}/stock-availability?configVersion=${configVersion}`,
      );
      setStockAvailMap(new Map(data.map((e) => [e.categoryId, e])));
    } catch {
      // non-blocking
    }
  }, []);

  return { stockAvailMap, fetchStockAvailability };
}
