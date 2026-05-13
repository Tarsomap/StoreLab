import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBrl } from '@/lib/format-brl';
import { StoreActionsMenu } from '@/features/store/components/StoreActionsMenu';
import { ROLE_LABELS } from '../lib/session-phases';
import type { StoreRole, StoreStatus } from '../types';

interface StoreCardProps {
  store: StoreStatus;
  initialCash: number;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

const ALL_ROLES: StoreRole[] = [
  'STORE_MANAGER',
  'SUPPLY_MANAGER',
  'COMMERCIAL_MANAGER',
  'OPERATIONAL_MANAGER',
  'SERVICE_MANAGER',
];

const brl = formatBrl;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** Cartão da loja: código, status do PO, resumo de caixa/EBITDA e lista de papéis preenchidos ou vazios. */
export function StoreCard({ store, initialCash: _initialCash, copiedCode, onCopy, onDeleted, onUpdated }: StoreCardProps) {
  const hasPlan = store.cashUsed > 0 || store.planConfirmed;
  const cashDanger = store.availableCash < 0;

  const borderClass = store.planConfirmed
    ? 'border-l-4 border-l-accent'
    : store.memberCount > 0
      ? 'border-l-4 border-l-warning'
      : 'border-l-4 border-l-muted';

  return (
    <Card className={`${borderClass} shadow-sm border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-display font-semibold text-base">
            {store.storeName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              className={
                store.planConfirmed
                  ? 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/10'
                  : 'bg-warning/10 text-warning border border-warning/20 hover:bg-warning/10'
              }
              variant="outline"
            >
              {store.planConfirmed ? 'PO confirmado' : 'PO pendente'}
            </Badge>
            <StoreActionsMenu
              store={{ id: store.storeId, name: store.storeName }}
              onDeleted={onDeleted}
              onUpdated={() => onUpdated()}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-widest bg-primary text-primary-foreground px-3 py-1 rounded-lg">
            {store.accessCode}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8"
            onClick={() => onCopy(store.accessCode)}
          >
            {copiedCode === store.accessCode ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>

        {hasPlan && (
          <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 rounded-md p-2.5">
            <div>
              <p className="text-muted-foreground mb-0.5">Caixa usado</p>
              <p className="font-mono font-semibold tabular-nums">{brl(store.cashUsed)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Disponível</p>
              <p className={`font-mono font-semibold tabular-nums ${cashDanger ? 'text-destructive' : ''}`}>
                {brl(store.availableCash)}
              </p>
            </div>
            {store.lastRoundEbitda !== null && store.lastRound !== null && (
              <div className="col-span-2 border-t pt-2 mt-0.5">
                <p className="text-muted-foreground mb-0.5">EBITDA R{store.lastRound}</p>
                <p
                  className={`font-mono font-semibold tabular-nums ${
                    (store.lastRoundEbitdaPct ?? 0) < 0 ? 'text-destructive' : 'text-accent'
                  }`}
                >
                  {brl(store.lastRoundEbitda)}{' '}
                  <span className="font-normal text-muted-foreground">
                    ({store.lastRoundEbitdaPct !== null ? pct(store.lastRoundEbitdaPct) : '—'})
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Membros ({store.memberCount}/5)
          </p>
          <div className="space-y-0.5">
            {ALL_ROLES.map((role) => {
              const member = store.members.find((m) => m.role === role);
              return (
                <div key={role} className="flex items-center justify-between text-sm py-0.5">
                  <span className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</span>
                  {member ? (
                    <span className="font-medium text-xs truncate max-w-[130px]">{member.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">vazio</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
