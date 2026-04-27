'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useSocket } from '@/hooks/useSocket';
import type {
  StoreSummary,
  SessionInfo,
  QuizQuestion,
  QuizQuestionsResponse,
  PlayerAnsweredPayload,
} from '../types';

// ── Helper ────────────────────────────────────────────────────────────────────

function roundFromStatus(status: string): number {
  if (status === 'ROUND_3') return 3;
  if (status === 'RECONFIGURATION' || status === 'ROUND_2') return 2;
  return 1;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UsePlayerQuizResult {
  store: StoreSummary | null;
  round: number;
  questions: QuizQuestion[];
  alreadyAnswered: boolean;
  progress: { answered: number; total: number } | null;
  loading: boolean;
  error: string;
  setAlreadyAnswered: (v: boolean) => void;
}

export function usePlayerQuiz(storeId: string): UsePlayerQuizResult {
  const { user } = useAuthStore();

  const [store, setStore] = useState<StoreSummary | null>(null);
  const [round, setRound] = useState(1);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [progress, setProgress] = useState<{ answered: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { on } = useSocket(store?.sessionId, storeId);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        const storeData = await api.get<StoreSummary>(`/stores/${storeId}`);
        setStore(storeData);

        const sessionData = await api.get<SessionInfo>(
          `/sessions/${storeData.sessionId}/status`,
        );
        const r = roundFromStatus(sessionData.status);
        setRound(r);

        const quizData = await api.get<QuizQuestionsResponse>(
          `/stores/${storeId}/quiz?round=${r}`,
        );
        setQuestions(quizData.questions);
        setAlreadyAnswered(quizData.alreadyAnswered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar quiz');
      } finally {
        setLoading(false);
      }
    }
    if (user) init();
  }, [storeId, user]);

  // ── Socket ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    return on<PlayerAnsweredPayload>('quiz:player-answered', (payload) => {
      if (payload.storeId === storeId && payload.round === round) {
        setProgress({ answered: payload.answered, total: payload.total });
      }
    });
  }, [on, storeId, round]);

  const handleSetAlreadyAnswered = useCallback((v: boolean) => {
    setAlreadyAnswered(v);
  }, []);

  return {
    store,
    round,
    questions,
    alreadyAnswered,
    progress,
    loading,
    error,
    setAlreadyAnswered: handleSetAlreadyAnswered,
  };
}
