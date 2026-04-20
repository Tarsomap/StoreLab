'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SessionStatus } from '@/features/session/types';
import type { QuizQuestion } from '../types';

interface UseQuizRoundProgressResult {
  hasQuestions: boolean;
  questionsCount: number;
  isLoading: boolean;
  error: boolean;
  refetch: () => void;
}

const MIN_QUESTIONS = 10;

export function useQuizRoundProgress(
  sessionId: string,
  round: number | null,
  _status: SessionStatus,
): UseQuizRoundProgressResult {
  const [questionsCount, setQuestionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!round) {
      setQuestionsCount(0);
      setError(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(false);
    api
      .get<QuizQuestion[]>(`/sessions/${sessionId}/quiz/questions?round=${round}`)
      .then((data) => {
        if (!cancelled) setQuestionsCount(data.length);
      })
      .catch(() => {
        if (!cancelled) { setQuestionsCount(0); setError(true); }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [sessionId, round, tick]);

  return {
    hasQuestions: questionsCount >= MIN_QUESTIONS,
    questionsCount,
    isLoading,
    error,
    refetch,
  };
}
