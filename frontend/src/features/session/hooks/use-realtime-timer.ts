'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import type { SessionDetail, TimerState, TimerUpdatePayload } from '../types';

/**
 * Carrega estado inicial do timer via API e mantém sincronizado via WebSocket.
 * Usado na tela do jogador para exibir o countdown em tempo real sem polling.
 */
export function useRealtimeTimer(sessionId: string | undefined): TimerState | null {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const { on } = useSocket(sessionId);

  useEffect(() => {
    if (!sessionId) return;
    api
      .get<SessionDetail>(`/sessions/${sessionId}`)
      .then((s) => {
        if (s.timerEnabled && s.timerDuration != null) {
          setTimerState({
            timerDuration: s.timerDuration,
            timerStartedAt: s.timerStartedAt,
            timerPausedAt: s.timerPausedAt,
            elapsedBeforePause: s.elapsedBeforePause,
          });
        }
      })
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    return on<TimerUpdatePayload>('session:timer_updated', (payload) => {
      const duration = payload.timerDuration;
      if (duration == null) return;
      setTimerState({
        timerDuration: duration,
        timerStartedAt: payload.timerStartedAt,
        timerPausedAt: payload.timerPausedAt,
        elapsedBeforePause: payload.elapsedBeforePause,
      });
    });
  }, [on]);

  return timerState;
}
