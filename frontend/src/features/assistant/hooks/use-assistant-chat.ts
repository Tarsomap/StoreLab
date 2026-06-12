'use client';

import { useCallback, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type {
  AssistantAskRequest,
  AssistantAskResponse,
  AssistantContext,
  AssistantMessage,
} from '../types';

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useAssistantChat(context: AssistantContext) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');

  const requestContext = useMemo(
    () => ({
      ...(context.sessionId ? { sessionId: context.sessionId } : {}),
      ...(context.storeId ? { storeId: context.storeId } : {}),
    }),
    [context.sessionId, context.storeId],
  );

  const ask = useCallback(
    async (rawQuestion: string, options?: { appendUserMessage?: boolean }) => {
      const question = rawQuestion.trim();
      if (!question || isLoading) return;
      const appendUserMessage = options?.appendUserMessage ?? true;

      setError('');
      setLastQuestion(question);
      setIsLoading(true);
      if (appendUserMessage) {
        setMessages((current) => [
          ...current,
          { id: createMessageId(), role: 'user', content: question },
        ]);
      }

      try {
        const body: AssistantAskRequest = {
          question,
          ...requestContext,
        };
        const response = await api.post<AssistantAskResponse>('/assistant/ask', body);

        setMessages((current) => [
          ...current,
          {
            id: createMessageId(),
            role: 'assistant',
            content: response.answer,
            provider: response.provider,
            model: response.model,
            fallbackUsed: response.fallbackUsed,
          },
        ]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível consultar o assistente agora.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, requestContext],
  );

  const retry = useCallback(() => {
    if (lastQuestion) void ask(lastQuestion, { appendUserMessage: false });
  }, [ask, lastQuestion]);

  const reset = useCallback(() => {
    setMessages([]);
    setError('');
    setLastQuestion('');
  }, []);

  return {
    messages,
    isLoading,
    error,
    ask,
    retry,
    reset,
  };
}
