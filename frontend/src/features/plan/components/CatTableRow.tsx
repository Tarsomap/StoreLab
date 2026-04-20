import { cn } from '@/lib/utils';
import { formatBrl } from '@/lib/format-brl';

interface CatRowData {
  categoryId: string;
}

/**
 * Linha de tabela transversal: uma métrica (`label`) repetida por coluna de categoria + coluna de total.
 * Props: `rows` (categorias), `getValue` (como mostrar cada célula), `total` opcional (soma por linha).
 * Papel no jogo: compara Perecíveis, Mercearia, Eletro e Hipel na mesma grade sem duplicar JSX na página principal.
 */
export function CatTableRow<T extends CatRowData>({
  label,
  rows,
  getValue,
  total,
  muted,
  bold,
}: {
  label: string;
  rows: T[];
  getValue: (r: T) => string;
  total?: (r: T) => number;
  muted?: boolean;
  bold?: boolean;
}) {
  const totalVal = total ? rows.reduce((s, r) => s + total(r), 0) : null;
  const cellReadOnly =
    'cursor-default bg-muted/50 select-none px-3 py-2 text-right font-mono text-xs';
  return (
    <tr className="border-b last:border-0">
      <td
        className={`px-4 py-2 text-xs cursor-default ${muted ? 'text-muted-foreground' : bold ? 'font-semibold' : 'font-medium'}`}
      >
        {label}
      </td>
      {rows.map((r) => (
        <td
          key={r.categoryId}
          className={cn(
            cellReadOnly,
            muted ? 'text-muted-foreground' : bold ? 'font-semibold text-foreground' : 'text-foreground',
          )}
        >
          {getValue(r)}
        </td>
      ))}
      <td className={cn(cellReadOnly, 'px-4 font-semibold text-foreground')}>
        {totalVal !== null ? formatBrl(totalVal) : '—'}
      </td>
    </tr>
  );
}
