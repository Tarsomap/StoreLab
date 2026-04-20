import { LayoutDashboard, Play, Store, TrendingUp } from 'lucide-react';

interface SessionKpi {
  total: number;
  activeCount: number;
  trainedStores: number | '—';
  completionPct: number;
}

interface SessionKpiCardsProps {
  kpi: SessionKpi;
}

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors duration-200">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="mt-3 font-mono text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

/** Grade de 4 KPIs do dashboard do facilitador. */
export function SessionKpiCards({ kpi }: SessionKpiCardsProps) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Indicadores do dashboard"
    >
      <KpiCard label="Total de sessões" value={kpi.total} icon={<LayoutDashboard className="h-4 w-4" />} />
      <KpiCard label="Sessões ativas" value={kpi.activeCount} icon={<Play className="h-4 w-4" />} />
      <KpiCard label="Lojas treinadas" value={kpi.trainedStores} icon={<Store className="h-4 w-4" />} />
      <KpiCard label="Taxa de conclusão" value={`${kpi.completionPct}%`} icon={<TrendingUp className="h-4 w-4" />} />
    </div>
  );
}
