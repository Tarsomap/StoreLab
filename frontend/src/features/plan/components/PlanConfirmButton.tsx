import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StoreRole, PlanFullResponse, ConfirmState } from '../types';

export function PlanConfirmButton({
  myRole,
  plan,
  saving,
  confirmState,
  onConfirm,
}: {
  myRole: StoreRole | null;
  plan: PlanFullResponse;
  saving: boolean;
  confirmState: ConfirmState;
  onConfirm: () => void;
}) {
  if (myRole !== 'STORE_MANAGER') {
    if (!plan.confirmed) return null;
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/8 py-4">
        <CheckCircle2 className="h-5 w-5 text-accent" />
        <p className="text-sm font-semibold text-accent">
          Plano confirmado
          {plan.confirmedAt && (
            <span className="font-normal text-muted-foreground ml-1">
              em {new Date(plan.confirmedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </p>
      </div>
    );
  }

  if (plan.confirmed || confirmState === 'success') {
    return (
      <Button
        type="button"
        disabled
        className="w-full h-14 text-base font-bold rounded-xl gap-2 shadow-lg bg-accent text-accent-foreground opacity-100 cursor-not-allowed"
      >
        <span className="text-lg leading-none" aria-hidden>✓</span>
        PO Confirmado
      </Button>
    );
  }

  return (
    <div className="relative">
      {confirmState === 'idle' && (
        <div className="absolute -inset-1 rounded-2xl bg-accent/20 blur-md animate-pulse" />
      )}
      <Button
        type="button"
        onClick={onConfirm}
        disabled={saving || confirmState === 'loading' || confirmState === 'error'}
        className={cn(
          'relative w-full h-14 text-base font-bold rounded-xl gap-3 shadow-lg text-accent-foreground',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'transition-all duration-200',
          confirmState === 'idle' && 'bg-accent hover:bg-accent/90 hover:shadow-accent/25 hover:shadow-xl hover:-translate-y-0.5',
          confirmState === 'loading' && 'bg-accent',
          confirmState === 'error' && 'bg-accent border-2 border-destructive ring-2 ring-destructive/30',
        )}
      >
        {confirmState === 'loading' ? (
          <>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2 shrink-0"
              aria-hidden
            />
            Confirmando...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Confirmar Plano Operacional
          </>
        )}
      </Button>
    </div>
  );
}
