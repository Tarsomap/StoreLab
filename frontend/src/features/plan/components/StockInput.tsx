'use client';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Campo numérico de compra de estoque por categoria; ao sair do campo (`blur`), envia o valor para o pai se mudou.
 * Props: `value` atual, `disabled` conforme papel/PO confirmado, `onCommit`, `maxAvailable` (estoque compartilhado), `catInputClass` (cor da categoria).
 * Papel no jogo: o Supply Manager ajusta quantidades respeitando o que ainda resta no pool da sessão; aviso visual se passar do disponível.
 */
export function StockInput({
  value,
  disabled,
  onCommit,
  maxAvailable,
  catInputClass,
}: {
  value: number;
  disabled: boolean;
  onCommit: (v: number) => void;
  maxAvailable?: number;
  catInputClass?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const draftNum = Number(draft);
  const overLimit = maxAvailable !== undefined && !isNaN(draftNum) && draftNum > maxAvailable;

  return (
    <div>
      <Input
        type="number"
        min={0}
        max={maxAvailable}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = Number(draft);
          if (!isNaN(v) && v !== value) onCommit(v);
        }}
        disabled={disabled}
        className={cn(
          'w-24 text-right h-7 text-xs px-2 font-mono',
          catInputClass,
          overLimit && 'border-destructive focus-visible:ring-destructive',
          disabled && 'disabled:bg-muted/50 disabled:cursor-default',
        )}
      />
      {maxAvailable !== undefined && (
        <p className={`text-[10px] mt-0.5 text-right font-mono
          ${overLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          Disp: {maxAvailable.toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}
