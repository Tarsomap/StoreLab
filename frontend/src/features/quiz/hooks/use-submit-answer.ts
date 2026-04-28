'use client';

import { useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import type { SubmitResponse } from '../types';

interface AnswerEntry {
  questionId: string;
  optionId: string;
}

interface UseSubmitAnswerResult {
  submit: (round: number, answers: AnswerEntry[]) => Promise<void>;
  submitting: boolean;
  submitError: string;
  result: SubmitResponse | null;
}

export function useSubmitAnswer(storeId: string): UseSubmitAnswerResult {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<SubmitResponse | null>(null);

  const submit = useCallback(
    async (round: number, answers: AnswerEntry[]) => {
      setSubmitError('');
      setSubmitting(true);
      try {
        const data = await api.post<SubmitResponse>(`/stores/${storeId}/quiz/submit`, {
          round,
          answers,
        });
        setResult(data);
      } catch (err) {
        setSubmitError(err instanceof ApiError ? err.message : 'Erro ao enviar respostas');
      } finally {
        setSubmitting(false);
      }
    },
    [storeId],
  );

  return { submit, submitting, submitError, result };
}
