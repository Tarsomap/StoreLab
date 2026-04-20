'use client';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Campo de margem em percentual (0–500 na UI = 0%–500% em decimal no plano); confirma no `blur`.
 * Props: `value` em fração (ex.: 0,15), `disabled`, `onCommit`, classes da categoria.
 * Papel no jogo: o Commercial Manager define markup sobre custo; valores ficam separados do componente da página para reutilizar a mesma lógica de rascunho/commit.
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
  const [draft, setDraft] = useState(String(Math.round(value * 100)));
  useEffect(() => setDraft(String(Math.round(value * 100))), [value]);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Input
        type="number"
        min={0}
        max={500}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = Number(draft) / 100;
          if (!isNaN(v) && v !== value) onCommit(v);
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
