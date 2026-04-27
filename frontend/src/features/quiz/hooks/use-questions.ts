'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { QuestionDraft, SavedQuestion } from '../types';
import { QUESTIONS_COUNT, OPTIONS_COUNT } from '../types';

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Estrutura vazia de uma pergunta com quatro alternativas. */
export function makeBlankQuestion(): QuestionDraft {
  return {
    prompt: '',
    options: Array.from({ length: OPTIONS_COUNT }, () => ({
      label: '',
      isCorrect: false,
    })),
  };
}

/** Dez perguntas em branco (regra do jogo). */
export function makeBlankQuestions(): QuestionDraft[] {
  return Array.from({ length: QUESTIONS_COUNT }, makeBlankQuestion);
}

/** Mescla resposta da API nas posições por `order` (1-based). */
export function fromSaved(saved: SavedQuestion[]): QuestionDraft[] {
  const drafts = makeBlankQuestions();
  for (const q of saved) {
    const idx = q.order - 1;
    if (idx >= 0 && idx < QUESTIONS_COUNT) {
      drafts[idx] = {
        prompt: q.prompt,
        options: q.options.map((o) => ({ label: o.label, isCorrect: o.isCorrect })),
      };
    }
  }
  return drafts;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseQuestionsResult {
  questions: QuestionDraft[];
  savedCount: number;
  loading: boolean;
  error: string;
  refetch: () => void;
}

export function useQuestions(
  sessionId: string,
  round: 1 | 2 | 3,
): UseQuestionsResult {
  const [questions, setQuestions] = useState<QuestionDraft[]>(makeBlankQuestions);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  const fetchRound = useCallback(
    async (r: 1 | 2 | 3) => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get<SavedQuestion[]>(
          `/sessions/${sessionId}/quiz/questions?round=${r}`,
        );
        setSavedCount(data.length);
        setQuestions(fromSaved(data));
      } catch {
        // No questions saved yet — start with blank form
        setSavedCount(0);
        setQuestions(makeBlankQuestions());
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    fetchRound(round);
  }, [round, fetchRound, tick]);

  return { questions, savedCount, loading, error, refetch };
}
