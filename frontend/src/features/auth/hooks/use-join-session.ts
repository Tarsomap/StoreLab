'use client';

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { JoinResponse, StoreRole, UserStoreEntry } from '../types';

interface UseJoinSessionResult {
  myStores: UserStoreEntry[];
  loadingMine: boolean;
  joined: JoinResponse | null;
  loading: boolean;
  error: string;
  join: (accessCode: string, role: StoreRole) => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export function useJoinSession(): UseJoinSessionResult {
  const [myStores, setMyStores] = useState<UserStoreEntry[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [joined, setJoined] = useState<JoinResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<UserStoreEntry[]>('/stores/mine')
      .then(setMyStores)
      .catch(() => setMyStores([]))
      .finally(() => setLoadingMine(false));
  }, []);

  async function join(accessCode: string, role: StoreRole) {
    setError('');
    setLoading(true);
    try {
      const store = await api.post<JoinResponse>('/stores/join', {
        accessCode: accessCode.toUpperCase().trim(),
        role,
      });
      setJoined(store);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao entrar na loja');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setJoined(null);
    setError('');
  }

  function clearError() {
    setError('');
  }

  return { myStores, loadingMine, joined, loading, error, join, reset, clearError };
}
