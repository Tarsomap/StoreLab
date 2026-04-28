'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import type { RankingEntry, StoreResultEntry, RoundResultEntry } from '../types';

export function useResults(sessionId: string): {
  ranking: RankingEntry[];
  storeResults: StoreResultEntry[];
  loading: boolean;
  error: string;
  refetch: () => void;
} {
  const { user } = useAuthStore();
  const { on } = useSocket(sessionId);

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [storeResults, setStoreResults] = useState<StoreResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    Promise.all([
      api.get<RankingEntry[]>(`/results/${sessionId}/ranking`),
      api.get<StoreResultEntry[]>(`/results/${sessionId}`),
    ]).then(([rankData, resultsData]) => {
      setRanking(rankData);
      setStoreResults(resultsData);
    });
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    async function load() {
      try {
        const [rankData, resultsData] = await Promise.all([
          api.get<RankingEntry[]>(`/results/${sessionId}/ranking`),
          api.get<StoreResultEntry[]>(`/results/${sessionId}`),
        ]);
        setRanking(rankData);
        setStoreResults(resultsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar resultados');
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [sessionId, user]);

  // Socket: update when new round results arrive
  useEffect(() => {
    return on<{ results: RoundResultEntry[] }>('round:results', () => {
      refetch();
    });
  }, [on, refetch]);

  // Socket: update when session finishes
  useEffect(() => {
    return on<unknown>('session:finished', () => {
      refetch();
    });
  }, [on, refetch]);

  return { ranking, storeResults, loading, error, refetch };
}
