'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

function calcRemaining(
  timerDuration: number,
  timerStartedAt: string | null,
  timerPausedAt: string | null,
  elapsedBeforePause: number,
): number {
  if (!timerStartedAt) return timerDuration - elapsedBeforePause;
  if (timerPausedAt) return timerDuration - elapsedBeforePause;
  const runningElapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
  return Math.max(0, timerDuration - elapsedBeforePause - runningElapsed);
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface TimerDisplayProps {
  timerDuration: number;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  elapsedBeforePause: number;
  size?: 'sm' | 'lg';
}

export function TimerDisplay({
  timerDuration,
  timerStartedAt,
  timerPausedAt,
  elapsedBeforePause,
  size = 'lg',
}: TimerDisplayProps) {
  const [remaining, setRemaining] = useState(() =>
    calcRemaining(timerDuration, timerStartedAt, timerPausedAt, elapsedBeforePause),
  );

  const isRunning = timerStartedAt !== null && timerPausedAt === null;
  const isPaused = timerStartedAt !== null && timerPausedAt !== null;

  useEffect(() => {
    setRemaining(calcRemaining(timerDuration, timerStartedAt, timerPausedAt, elapsedBeforePause));
    if (!isRunning) return;

    const id = setInterval(() => {
      setRemaining(calcRemaining(timerDuration, timerStartedAt, timerPausedAt, elapsedBeforePause));
    }, 1000);

    return () => clearInterval(id);
  }, [timerDuration, timerStartedAt, timerPausedAt, elapsedBeforePause, isRunning]);

  const expired = remaining <= 0 && isRunning;
  const urgent = remaining > 0 && remaining <= 60 && isRunning;

  const sizeClasses = size === 'lg' ? 'text-3xl gap-2' : 'text-base gap-1.5';
  const iconSize = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  const colorClass = expired
    ? 'text-destructive'
    : urgent
      ? 'text-warning'
      : isRunning
        ? 'text-foreground'
        : 'text-muted-foreground';

  return (
    <div className={`flex items-center font-mono font-bold tabular-nums ${sizeClasses} ${colorClass}`}>
      <Clock className={`${iconSize} shrink-0`} />
      <span>{formatTime(remaining)}</span>
      {isPaused && (
        <span className="text-xs font-normal text-muted-foreground ml-1">pausado</span>
      )}
      {expired && (
        <span className={`font-sans font-semibold animate-pulse ${size === 'lg' ? 'text-sm' : 'text-xs'} ml-1`}>
          Tempo esgotado!
        </span>
      )}
    </div>
  );
}
