'use client';

import { toast } from 'sonner';
import { Play, Pause, Square, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TimerDisplay } from './TimerDisplay';
import { useSessionTimer } from '../hooks/use-session-timer';
import { useTimerExpiry } from '../hooks/use-timer-expiry';
import type { SessionDetail, SessionStatus, TimerState } from '../types';

const ACTIVE_ROUND_STATUSES: SessionStatus[] = ['ROUND_1', 'ROUND_2', 'ROUND_3'];

interface SessionTimerCardProps {
  session: SessionDetail;
  onTimerChange: () => Promise<void>;
}

export function SessionTimerCard({ session, onTimerChange }: SessionTimerCardProps) {
  const { start, pause, stop, isLoading } = useSessionTimer(session.id);

  const timerStateForExpiry: TimerState | null =
    session.timerEnabled && session.timerDuration
      ? {
          timerDuration: session.timerDuration,
          timerStartedAt: session.timerStartedAt,
          timerPausedAt: session.timerPausedAt,
          elapsedBeforePause: session.elapsedBeforePause,
        }
      : null;

  const isExpired = useTimerExpiry(timerStateForExpiry);

  if (!session.timerEnabled || !session.timerDuration) return null;

  const isActive = ACTIVE_ROUND_STATUSES.includes(session.status);
  const isRunning = session.timerStartedAt !== null && session.timerPausedAt === null;
  const isPaused = session.timerStartedAt !== null && session.timerPausedAt !== null;

  async function handleStart() {
    try {
      await start();
      await onTimerChange();
      toast.success(isPaused ? 'Timer retomado' : 'Timer iniciado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar timer');
    }
  }

  async function handlePause() {
    try {
      await pause();
      await onTimerChange();
      toast.info('Timer pausado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao pausar timer');
    }
  }

  async function handleStop() {
    try {
      await stop();
      await onTimerChange();
      toast.info('Timer encerrado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao encerrar timer');
    }
  }

  return (
    <Card className="shadow-sm border rounded-xl">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm font-semibold uppercase tracking-wide">
            Timer da Rodada
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {Math.round(session.timerDuration / 60)} min configurados
          </span>
        </div>
      </CardHeader>
      <Separator className="my-3" />
      <CardContent className="pt-0 space-y-4">
        <TimerDisplay
          timerDuration={session.timerDuration}
          timerStartedAt={session.timerStartedAt}
          timerPausedAt={session.timerPausedAt}
          elapsedBeforePause={session.elapsedBeforePause}
          size="lg"
        />

        {isExpired && isActive && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Tempo esgotado — avance para a próxima fase quando estiver pronto.</span>
          </div>
        )}

        {isActive ? (
          <div className="flex gap-2 flex-wrap">
            {!isRunning && (
              <Button size="sm" onClick={handleStart} disabled={isLoading} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                {isPaused ? 'Continuar' : 'Iniciar'}
              </Button>
            )}
            {isRunning && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePause}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Pause className="h-3.5 w-3.5" />
                Pausar
              </Button>
            )}
            {(isRunning || isPaused) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStop}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Encerrar
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Controles disponíveis durante as rodadas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
