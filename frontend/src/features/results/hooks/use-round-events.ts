'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface SlaEventEntry {
  id: string;
  storeId: string;
  store: { id: string; name: string };
  capexOptionId: string;
  capexOption: { name: string; type: string };
  round: number;
  occurred: boolean;
  daysDown: number;
  revenueLost: number;
  createdAt: string;
}

export interface RandomEventEntry {
  id: string;
  storeId: string;
  store: { id: string; name: string };
  round: number;
  eventType: string;
  occurred: boolean;
  impactData: Record<string, unknown>;
  createdAt: string;
}

export interface RoundEventsResponse {
  round: number;
  slaEvents: SlaEventEntry[];
  randomEvents: RandomEventEntry[];
}

export function useRoundEvents(sessionId: string, round: number) {
  const [data, setData] = useState<RoundEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<RoundEventsResponse>(`/results/${sessionId}/events/${round}`);
      setData(res);
    } catch {
      setError('Erro ao carregar eventos da rodada');
    } finally {
      setLoading(false);
    }
  }, [sessionId, round]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
