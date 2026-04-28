import { Badge } from '@/components/ui/badge';
import type { TransferSummaryEntry } from '../types';

interface TransferListProps {
  stores: TransferSummaryEntry[];
}

export function TransferList({ stores }: TransferListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stores.map((store) => (
        <div key={store.storeId} className="rounded-xl border p-3">
          <p className="font-display font-semibold text-sm text-foreground">{store.storeName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Saídas:{' '}
            <span className="font-mono text-foreground">{store.outboundTransfers}</span>
            {' / '}
            {store.minimumRequired}-{store.maximumAllowed}
          </p>
          <Badge
            variant="outline"
            className={`mt-2 ${
              store.requirementMet
                ? 'border-accent/30 bg-accent/10 text-accent'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {store.requirementMet ? 'Concluído' : 'Pendente'}
          </Badge>
        </div>
      ))}
    </div>
  );
}
