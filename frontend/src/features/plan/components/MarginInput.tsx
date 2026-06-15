'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Campo de margem em percentual (0–500 na UI = 0%–500% em decimal no plano); confirma no `blur` ou ao pressionar Enter.
 * Props: `value` em fração (ex.: 0,15), `disabled`, `onCommit`, classes da categoria.
 * Papel no jogo: o Commercial Manager define markup sobre custo.
 *
 * Mesma estratégia do StockInput: `editing` só vale enquanto o campo está focado;
 * fora do foco o input mostra sempre `value`, evitando que a margem salva "suma"
 * da célula após um plan:updated.
 */
export function MarginInput({
  value,
  disabled,
  onCommit,
  catInputClass,
}: {
  value: number;
  disabled: boolean;
  onCommit: (v: number) => void;
  catInputClass?: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const display = editing ?? String(Math.round(value * 100));

  function commit() {
    if (editing === null) return;
    const trimmed = editing.trim();
    const v = Number(trimmed) / 100;
    if (trimmed !== '' && !isNaN(v) && v !== value) onCommit(v);
    setEditing(null);
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Input
        type="number"
        min={0}
        max={500}
        value={display}
        onFocus={() => setEditing(String(Math.round(value * 100)))}
        onChange={(e) => setEditing(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        disabled={disabled}
        className={cn(
          'w-20 text-right h-7 text-xs px-2 font-mono',
          catInputClass,
          disabled && 'disabled:bg-muted/50 disabled:cursor-default',
        )}
      />
      <span className="text-muted-foreground text-xs font-mono">%</span>
    </div>
  );
}
