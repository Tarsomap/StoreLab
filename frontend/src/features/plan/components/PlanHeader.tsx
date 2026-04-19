import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle2, Loader2 } from 'lucide-react';

export function PlanHeader({
  storeName,
  roundLabel,
  editable,
  saving,
  confirmed,
}: {
  storeName: string;
  roundLabel: string;
  editable: boolean;
  saving: boolean;
  confirmed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pt-1">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground leading-tight truncate">
            {storeName}
          </h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
            Plano Operacional
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editable && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            AO VIVO
          </span>
        )}
        <Badge
          className="bg-primary/10 text-primary border-primary/20 font-mono text-xs px-3 py-1"
          variant="outline"
        >
          {roundLabel}
        </Badge>
        {confirmed && (
          <Badge className="bg-accent/15 text-accent border-accent/30 gap-1.5" variant="outline">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirmado
          </Badge>
        )}
        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Salvando...
          </span>
        )}
      </div>
    </div>
  );
}
