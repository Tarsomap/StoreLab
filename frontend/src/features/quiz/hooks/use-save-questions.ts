import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { QuestionDraft } from '../types';

interface SaveQuestionsParams {
  sessionId: string;
  round: 1 | 2 | 3;
  questions: QuestionDraft[];
}

export function useSaveQuestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async ({ sessionId, round, questions }: SaveQuestionsParams): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/sessions/${sessionId}/quiz/questions`, {
        round,
        questions: questions.map((q, idx) => ({
          prompt: q.prompt.trim(),
          order: idx + 1,
          options: q.options.map((o) => ({
            label: o.label.trim(),
            isCorrect: o.isCorrect,
          })),
        })),
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao salvar perguntas';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
