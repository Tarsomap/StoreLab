'use client';

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';

export function useRoundStarted(sessionId?: string, onRoundStarted?: (round: number) => void) {
  const { on } = useSocket(sessionId);

  const handleRoundStarted = useCallback(
    ({ round }: { round: number }) => {
      toast.info(`Rodada ${round} iniciada! Prepare seu Plano Operacional.`, {
        duration: 6000,
        id: `round-started-${round}`,
      });
      onRoundStarted?.(round);
    },
    [onRoundStarted],
  );

  useEffect(() => {
    return on<{ round: number }>('round:started', handleRoundStarted);
  }, [on, handleRoundStarted]);
}
