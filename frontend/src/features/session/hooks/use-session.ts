'use client';

import { useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import type { SessionDetail, SessionStatusResponse } from '../types';

interface UseSessionResult {
  session: SessionDetail | null;
  statusData: SessionStatusResponse | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

export function useSession(sessionId: string): UseSessionResult {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [statusData, setStatusData] = useState<SessionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    setError('');
    try {
      const [sessionRes, statusRes] = await Promise.all([
        api.get<SessionDetail>(`/sessions/${sessionId}`),
        api.get<SessionStatusResponse>(`/sessions/${sessionId}/status`),
      ]);
      setSession(sessionRes);
      setStatusData(statusRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar sessão');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return { session, statusData, loading, error, refetch };
}
