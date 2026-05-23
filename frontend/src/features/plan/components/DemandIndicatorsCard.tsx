import { ShoppingBag, Box, Smile, PieChart } from 'lucide-react';
import { formatBrl } from '@/lib/format-brl';
import { pct } from '../lib/plan-math';

export interface StoreDemandIndicators {
  basketPrice: number | null;
  availability: number | null;
  csat: number | null;
  rankScore: number | null;
  demandShare: number | null;
}

export function DemandIndicatorsCard({ indicators }: { indicators: StoreDemandIndicators | null }) {
  const isAvailable = indicators && indicators.basketPrice !== null;
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="rounded-xl border p-4 shadow-sm bg-card border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preço da Cesta</p>
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="font-mono text-2xl font-bold leading-none text-foreground">
          {isAvailable ? formatBrl(indicators.basketPrice!) : '—'}
        </p>
      </div>

      <div className="rounded-xl border p-4 shadow-sm bg-card border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Disponibilidade</p>
          <Box className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="font-mono text-2xl font-bold leading-none text-foreground">
          {isAvailable ? pct(indicators.availability!) : '—'}
        </p>
      </div>

      <div className="rounded-xl border p-4 shadow-sm bg-card border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CSAT</p>
          <Smile className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="font-mono text-2xl font-bold leading-none text-foreground">
          {isAvailable ? pct(indicators.csat!) : '—'} 
        </p>
      </div>

      <div className="rounded-xl border p-4 shadow-sm bg-card border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Demanda (Share)</p>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="font-mono text-2xl font-bold leading-none text-foreground">
          {isAvailable ? pct(indicators.demandShare!) : '—'}
        </p>
      </div>
    </div>
  );
}
