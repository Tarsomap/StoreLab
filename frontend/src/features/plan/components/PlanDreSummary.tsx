import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, ClipboardCheck } from 'lucide-react';
import { TermTooltip } from '@/components/term-tooltip';
import { DreLines } from '../types';
import { brl, pct } from '../lib/plan-math';
import { DreLine } from './DreLine';

export function PlanDreSummary({ dre }: { dre: DreLines }) {
  const ebitdaPositive = dre.ebitda >= 0;
  const pctOf = (v: number) => dre.totalVendas > 0 ? v / dre.totalVendas : 0;

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
          <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-display flex items-center gap-1.5">
          DRE — Plano Operacional
          <TermTooltip term="DRE" side="right" />
        </h2>
      </div>
      <Separator />
      <CardContent className="px-4 pb-2 pt-3 space-y-0">
        <DreLine label="Total de Vendas" value={brl(dre.totalVendas)} bold />
        <DreLine label="(-) Impostos" value={brl(dre.impostos)} pctVal={pctOf(dre.impostos)} indent />
        <DreLine label="Venda Líquida" value={brl(dre.vendaLiquida)} subtotal />
        <DreLine label="(-) Custo de Venda" value={brl(dre.custoVenda)} pctVal={pctOf(dre.custoVenda)} indent />
        <DreLine label="Massa Mg Líquida" value={brl(dre.massaMgLiquida)} subtotal />
        <DreLine label="(-) Quebras" value={brl(dre.quebras)} pctVal={pctOf(dre.quebras)} indent term="QUEBRAS" />
        <DreLine label="(-) Aging" value={brl(dre.aging)} pctVal={pctOf(dre.aging)} indent term="AGING" />
        <DreLine label="Massa Final" value={brl(dre.massaFinal)} subtotal />

        <div className="flex items-center gap-1.5 pt-2 pb-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
            Custos Fixos
          </span>
          <Separator className="flex-1 bg-border/50" />
        </div>

        <DreLine label="(-) Folha" value={brl(dre.folha)} pctVal={pctOf(dre.folha)} indent />
        <DreLine label="(-) Manutenção" value={brl(dre.manutencao)} pctVal={pctOf(dre.manutencao)} indent />
        <DreLine label="(-) Juros" value={brl(dre.juros)} pctVal={pctOf(dre.juros)} indent term="JUROS" />
        <DreLine label="(-) Licenças" value={brl(dre.licencas)} pctVal={pctOf(dre.licencas)} indent term="LICENCAS" />

        <div
          className={`mt-3 mb-1 rounded-xl p-3 transition-all
            ${ebitdaPositive
              ? 'bg-accent/12 border border-accent/25'
              : 'bg-destructive/12 border border-destructive/25'
            }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              EBITDA
              <TermTooltip term="EBITDA" side="right" />
            </span>
            {ebitdaPositive
              ? <TrendingUp className="h-3.5 w-3.5 text-accent" />
              : <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            }
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className={`font-mono text-xl font-bold leading-none ${ebitdaPositive ? 'text-accent' : 'text-destructive'}`}>
              {brl(dre.ebitda)}
            </p>
            <p className={`font-mono text-sm font-semibold ${ebitdaPositive ? 'text-accent/80' : 'text-destructive/80'}`}>
              {pct(dre.ebitdaPct)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
