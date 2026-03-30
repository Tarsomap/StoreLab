'use client';

import { useEffect, useRef, useState } from 'react';

export type ValueFlash = 'up' | 'down' | null;

/**
 * Destaca variação de valor (ex.: atualização via WebSocket).
 * `active`: só compara após dados reais existirem (evita flash na carga inicial).
 * `resetKey`: ao mudar (ex.: plan.id), reinicia o valor de referência.
 */
export function useAnimatedValue(
  value: number,
  active: boolean,
  resetKey?: string | null,
): ValueFlash {
  const prevRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<ValueFlash>(null);

  useEffect(() => {
    prevRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    if (!active) return;
    if (prevRef.current === null) {
      prevRef.current = value;
      return;
    }
    if (value !== prevRef.current) {
      setFlash(value > prevRef.current ? 'up' : 'down');
      prevRef.current = value;
      const t = setTimeout(() => setFlash(null), 800);
      return () => clearTimeout(t);
    }
  }, [value, active]);

  return flash;
}
