'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Campo numérico de compra de estoque por categoria; confirma no `blur` ou ao pressionar Enter.
 * Props: `value` atual, `disabled` conforme papel/PO confirmado, `onCommit`, `maxAvailable` (estoque compartilhado), `catInputClass` (cor da categoria).
 * Papel no jogo: o Supply Manager ajusta quantidades respeitando o que ainda resta no pool da sessão; aviso visual se passar do disponível.
 *
 * `editing` guarda o texto digitado APENAS enquanto o campo está focado. Fora do
 * foco o input exibe sempre `value` (a fonte da verdade vinda do plano), então o
 * valor salvo nunca "some" da célula — mesmo que um evento plan:updated chegue
 * logo após o commit. O padrão anterior (draft local sincronizado por useEffect)
 * podia desincronizar e limpar a célula.
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
  const [editing, setEditing] = useState<string | null>(null);
  const display = editing ?? String(value);

  const draftNum = Number(display);
  const overLimit =
    maxAvailable !== undefined && !isNaN(draftNum) && draftNum > maxAvailable;

  function commit() {
    if (editing === null) return;
    const trimmed = editing.trim();
    const v = Number(trimmed);
    if (trimmed !== '' && !isNaN(v) && v !== value) onCommit(v);
    setEditing(null);
  }

  return (
    <div>
      <Input
        type="number"
        min={0}
        max={maxAvailable}
        value={display}
        onFocus={() => setEditing(String(value))}
        onChange={(e) => setEditing(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
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
