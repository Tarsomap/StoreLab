import { CheckCircle2, Clock } from 'lucide-react';
import type { StoreStatus, SessionStatus } from '../types';

const PHASES_WITH_PO = new Set<SessionStatus>([
  'ROUND_1_CONFIG',
  'ROUND_1',
  'RECONFIGURATION',
  'ROUND_2',
  'ROUND_3',
]);

interface Props {
  stores: StoreStatus[];
  status: SessionStatus;
}

export function StoresReadyBanner({ stores, status }: Props) {
  if (!PHASES_WITH_PO.has(status) || stores.length === 0) return null;

  const confirmed = stores.filter((s) => s.planConfirmed);
  const pending = stores.filter((s) => !s.planConfirmed);
  const allConfirmed = pending.length === 0;

  if (allConfirmed) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-accent">Todas as lojas confirmaram o PO</p>
          <p className="text-xs text-muted-foreground">Você pode avançar para a próxima etapa.</p>
        </div>
        <span className="font-mono text-sm font-bold text-accent ml-auto shrink-0">
          {confirmed.length}/{stores.length}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
      <Clock className="h-5 w-5 text-warning shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-warning">
          {confirmed.length}/{stores.length} lojas confirmaram o PO
        </p>
        <p className="text-xs text-muted-foreground truncate">
          Aguardando: {pending.map((s) => s.storeName).join(', ')}
        </p>
      </div>
      <span className="font-mono text-sm font-bold text-warning ml-auto shrink-0">
        {confirmed.length}/{stores.length}
      </span>
    </div>
  );
}
