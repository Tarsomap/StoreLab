import { TermTooltip } from '@/components/term-tooltip';
import { GlossaryTerm } from '@/lib/term-glossary';

export function DreLine({
  label,
  value,
  pctVal,
  bold,
  subtotal,
  indent,
  danger,
  term,
}: {
  label: string;
  value: string;
  pctVal?: number;
  bold?: boolean;
  subtotal?: boolean;
  indent?: boolean;
  danger?: boolean;
  term?: GlossaryTerm;
}) {
  return (
    <div
      className={`flex items-center justify-between py-[5px] text-sm gap-2
        ${subtotal ? 'border-t border-border/60 mt-0.5 pt-2 font-semibold' : ''}
        ${bold ? 'font-bold text-[15px]' : ''}
        ${indent ? 'pl-3' : ''}
      `}
    >
      <span className={`flex items-center gap-1 flex-1 text-[13px] leading-snug ${indent ? 'text-muted-foreground' : ''}`}>
        {label}
        {term && <TermTooltip term={term} side="right" />}
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
