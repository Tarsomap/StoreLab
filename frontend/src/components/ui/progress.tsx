/** Barra de progresso só com Tailwind — preenchimento animado conforme `value` 0–100. */
import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Preenche a faixa da esquerda para a direita até `value`% (útil para “X de Y responderam”). */
export function Progress({
  className,
  value,
  ...props
}: HTMLAttributes<HTMLDivElement> & { value: number }) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
