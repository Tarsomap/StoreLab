'use client';

import { useState, useEffect } from 'react';
import type { TimerState } from '../types';

function calcRemaining(s: TimerState): number {
  if (!s.timerStartedAt) return s.timerDuration - s.elapsedBeforePause;
  if (s.timerPausedAt) return s.timerDuration - s.elapsedBeforePause;
  const elapsed = Math.floor((Date.now() - new Date(s.timerStartedAt).getTime()) / 1000);
  return Math.max(0, s.timerDuration - s.elapsedBeforePause - elapsed);
}

/**
 * Retorna true a partir do momento em que o tempo restante chega a zero.
 * Atualiza via setInterval enquanto o timer estiver em execução.
 */
export function useTimerExpiry(timerState: TimerState | null): boolean {
  const [expired, setExpired] = useState(() =>
    timerState !== null && calcRemaining(timerState) <= 0,
  );

  const { timerDuration, timerStartedAt, timerPausedAt, elapsedBeforePause } = timerState ?? {};
  const isRunning = timerStartedAt != null && timerPausedAt == null;

  useEffect(() => {
    if (!timerState || !isRunning) {
      setExpired(false);
      return;
    }
    const check = () => setExpired(calcRemaining(timerState) <= 0);
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerDuration, timerStartedAt, timerPausedAt, elapsedBeforePause, isRunning]);

  return expired;
}
