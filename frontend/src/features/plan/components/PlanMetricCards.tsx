import { TrendingUp, TrendingDown, Wallet, ShoppingBag, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanFullResponse, DreLines } from '../types';
import { brl, pct } from '../lib/plan-math';

export function PlanMetricCards({
  plan,
  dre,
  ebitdaFlash,
  cashFlash,
}: {
  plan: PlanFullResponse;
  dre: DreLines;
  ebitdaFlash: 'up' | 'down' | null;
  cashFlash: 'up' | 'down' | null;
}) {
  const ebitdaPositive = dre.ebitda >= 0;
  const totalCash = plan.financials.cashUsed + plan.financials.availableCash;
  const cashPct = totalCash > 0 ? Math.min((plan.financials.cashUsed / totalCash) * 100, 100) : 0;
  const cashCritical = plan.financials.availableCash < 0;
  const cashWarning = !cashCritical && cashPct > 75;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* EBITDA R$ */}
      <div
        className={cn(
          'rounded-xl border p-4 shadow-sm transition-colors duration-300',
          ebitdaPositive ? 'bg-accent/8 border-accent/25' : 'bg-destructive/8 border-destructive/25',
          ebitdaFlash === 'up' && 'bg-accent/20',
          ebitdaFlash === 'down' && 'bg-destructive/20',
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">EBITDA</p>
          {ebitdaPositive
            ? <TrendingUp className="h-4 w-4 text-accent" />
            : <TrendingDown className="h-4 w-4 text-destructive" />
          }
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-mono text-2xl font-bold leading-none ${ebitdaPositive ? 'text-accent' : 'text-destructive'}`}>
            {brl(dre.ebitda)}
          </p>
          {ebitdaFlash === 'up' && <span className="text-accent font-bold leading-none">↑</span>}
          {ebitdaFlash === 'down' && <span className="text-destructive font-bold leading-none">↓</span>}
        </div>
      </div>

      {/* EBITDA % */}
      <div className="rounded-xl border p-4 shadow-sm bg-card border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">EBITDA %</p>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`font-mono text-2xl font-bold leading-none ${ebitdaPositive ? 'text-accent' : 'text-destructive'}`}>
          {pct(dre.ebitdaPct)}
        </p>
      </div>

      {/* Cash gauge */}
      <div
        className={cn(
          'rounded-xl border p-4 shadow-sm col-span-2 lg:col-span-1 transition-colors duration-300',
          cashCritical ? 'bg-destructive/8 border-destructive/25' : cashWarning ? 'bg-warning/8 border-warning/25' : 'bg-card border-border',
          cashFlash === 'up' && 'bg-accent/20',
          cashFlash === 'down' && 'bg-destructive/20',
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Caixa Disponível</p>
          <Wallet className={`h-4 w-4 ${cashCritical ? 'text-destructive' : cashWarning ? 'text-warning' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <p className={`font-mono text-xl font-bold leading-none ${cashCritical ? 'text-destructive' : cashWarning ? 'text-warning' : 'text-foreground'}`}>
            {brl(plan.financials.availableCash)}
          </p>
          {cashFlash === 'up' && <span className="text-accent font-bold leading-none">↑</span>}
          {cashFlash === 'down' && <span className="text-destructive font-bold leading-none">↓</span>}
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${cashCritical ? 'bg-destructive' : cashWarning ? 'bg-warning' : 'bg-accent'}`}
            style={{ width: `${cashPct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
          {brl(plan.financials.cashUsed)} usado de {brl(totalCash)}
        </p>
      </div>

      {/* Total Vendas */}
      <div className="rounded-xl border p-4 shadow-sm bg-card border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total de Vendas</p>
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="font-mono text-xl font-bold leading-none text-foreground">
          {brl(dre.totalVendas)}
        </p>
      </div>
    </div>
  );
}
