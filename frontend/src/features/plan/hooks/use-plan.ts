'use client';
import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  PlanFullResponse,
  StoreSummary,
  StoreMemberEntry,
  StoreRole,
  PlayerScoreResponse,
} from '../types';
import { configVersionFromStatus } from '../lib/plan-math';
import { facilitatorQuizRound } from '@/features/session/lib/session-phases';
import type { SessionStatus } from '@/features/session/types';

export interface UsePlanResult {
  plan: PlanFullResponse | null;
  store: StoreSummary | null;
  myRole: StoreRole | null;
  quizScore: PlayerScoreResponse | null;
  sessionStatus: string | null;
  sessionRound: number | null;
  isLoading: boolean;
  error: string;
  setPlan: (plan: PlanFullResponse) => void;
  refetch: () => void;
}

/**
 * Encapsula todas as chamadas REST necessárias para carregar o Plano Operacional de uma loja:
 * store, members (para extrair o papel do usuário logado), status da sessão (para derivar configVersion)
 * e o plano em si. Também busca o score do quiz de forma não-bloqueante.
 */
export function usePlan(storeId: string): UsePlanResult {
  const { user } = useAuthStore();
  const [plan, setPlan] = useState<PlanFullResponse | null>(null);
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [myRole, setMyRole] = useState<StoreRole | null>(null);
  const [quizScore, setQuizScore] = useState<PlayerScoreResponse | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [sessionRound, setSessionRound] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    try {
      const [storeData, membersData] = await Promise.all([
        api.get<StoreSummary>(`/stores/${storeId}`),
        api.get<{ storeId: string; storeName: string; members: StoreMemberEntry[] }>(
          `/stores/${storeId}/members`,
        ),
      ]);
      setStore(storeData);
      const me = membersData.members.find((m) => m.userId === user.id);
      if (me) setMyRole(me.role);

      const sessionData = await api.get<{ status: string }>(`/sessions/${storeData.sessionId}/status`);
      setSessionStatus(sessionData.status);
      
      const realRound = facilitatorQuizRound(sessionData.status as SessionStatus);
      setSessionRound(realRound);

      const cv = configVersionFromStatus(sessionData.status);
      const planData = await api.get<PlanFullResponse>(`/plans/${storeId}/config/${cv}`);
      setPlan(planData);

      if (realRound !== null && realRound !== undefined) {
        api
          .get<PlayerScoreResponse>(`/stores/${storeId}/quiz/my-score?round=${realRound}`)
          .then(setQuizScore)
          .catch(() => {/* non-blocking */});
      } else {
        setQuizScore(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar plano');
    } finally {
      setIsLoading(false);
    }
  }, [storeId, user]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    plan,
    store,
    myRole,
    quizScore,
    sessionStatus,
    sessionRound,
    isLoading: isLoading && !plan && !error,
    error,
    setPlan,
    refetch: load,
  };
}
