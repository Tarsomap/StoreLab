import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CapexDecisionEntry } from '../types';
import { brl, hasSlaRisk } from '../lib/plan-math';

export function PlanCapexList({
  capexDecisions,
  planId,
  editable,
  saving,
  onMutate,
}: {
  capexDecisions: CapexDecisionEntry[];
  planId: string;
  editable: boolean;
  saving: boolean;
  onMutate: (path: string, body: unknown) => void;
}) {
  return (
    <Card className="shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-display">
          Investimentos (CAPEX)
        </h2>
      </div>
      <Separator />
      <CardContent className="pt-4 pb-4">
        <div className="space-y-2">
          {capexDecisions.map((cx) => {
            const risk = hasSlaRisk(cx.capexName);
            const showRisk = risk && !cx.implemented;
            return (
              <div
                key={cx.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md
                  ${cx.implemented
                    ? 'border-accent/25 bg-accent/5'
                    : showRisk
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-border bg-card'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={cx.implemented}
                  disabled={!editable || saving}
                  onChange={(e) =>
                    onMutate(`/plans/${planId}/capex-decision`, {
                      capexOptionId: cx.capexOptionId,
                      implemented: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-primary cursor-pointer disabled:cursor-not-allowed shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${cx.implemented ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {cx.capexName}
                    </span>
                    {showRisk && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning uppercase tracking-wide">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Risco SLA
                      </span>
                    )}
                    {cx.implemented && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wide">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Ativo
                      </span>
                    )}
                  </div>
                  {showRisk && (
                    <p className="text-[11px] text-warning/80 mt-0.5">
                      Evento negativo possível se não implementado
                    </p>
                  )}
                </div>
                <span className={`font-mono text-sm font-semibold shrink-0 ${cx.implemented ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {brl(cx.acquisitionCost)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
