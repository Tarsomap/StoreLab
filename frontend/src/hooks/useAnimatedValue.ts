'use client';

import { useEffect, useRef, useState } from 'react';

export type ValueFlash = 'up' | 'down' | null;

/**
 * Quando um número na tela muda (ex.: total vindo do WebSocket), devolve um sinal curto “subiu” ou “desceu”
 * para pintar borda/cor de destaque. Fica fora do componente grande do PO para reutilizar e manter a regra de comparação num só lugar.
 *
 * @param value - Valor atual exibido.
 * @param active - Só começa a comparar quando `true` (evita piscar na primeira carga antes de ter dado real).
 * @param resetKey - Ao mudar (ex.: id do plano), zera a referência para não comparar com número da sessão anterior.
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
