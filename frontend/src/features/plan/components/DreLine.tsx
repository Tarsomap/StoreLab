/**
 * Uma linha do painel DRE: rótulo à esquerda, percentual opcional no meio e valor monetário à direita.
 * Props: `label` (nome da linha), `value` (texto já formatado em R$), `pctVal` (fração para %), `bold`/`subtotal`/`indent`/`danger` para ênfase visual.
 * Papel no jogo: deixa o resumo financeiro do PO legível e alinhado ao design system (EBITDA negativo em vermelho).
 */
export function DreLine({
  label,
  value,
  pctVal,
  bold,
  subtotal,
  indent,
  danger,
}: {
  label: string;
  value: string;
  pctVal?: number;
  bold?: boolean;
  subtotal?: boolean;
  indent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-[5px] text-sm gap-2
        ${subtotal ? 'border-t border-border/60 mt-0.5 pt-2 font-semibold' : ''}
        ${bold ? 'font-bold text-[15px]' : ''}
        ${indent ? 'pl-3' : ''}
      `}
    >
      <span className={`flex-1 text-[13px] leading-snug ${indent ? 'text-muted-foreground' : ''}`}>
        {label}
      </span>
      <span className="text-right text-muted-foreground text-[11px] font-mono w-12 shrink-0">
        {pctVal !== undefined ? `${(pctVal * 100).toFixed(1)}%` : ''}
      </span>
      <span className={`text-right font-mono text-[13px] w-28 shrink-0 ${danger ? 'text-destructive' : ''}`}>
        {value}
      </span>
    </div>
  );
}
