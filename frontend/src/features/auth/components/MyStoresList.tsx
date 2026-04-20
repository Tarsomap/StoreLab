import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import type { UserStoreEntry } from '../types';
import { ROLE_LABELS } from '../types';

interface MyStoresListProps {
  stores: UserStoreEntry[];
  onNavigateToPlan: (storeId: string) => void;
}

/** Lista de lojas em que o jogador já está vinculado, com atalho para o PO. */
export function MyStoresList({ stores, onNavigateToPlan }: MyStoresListProps) {
  if (stores.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-card text-muted-foreground border shadow-sm">
          <Store className="h-6 w-6" aria-hidden />
        </div>
        <p className="font-display text-sm font-semibold text-foreground">
          Nenhuma loja vinculada ainda
        </p>
        <p className="text-xs text-muted-foreground font-body max-w-xs mx-auto leading-relaxed">
          Quando entrar com um código válido, sua loja aparecerá aqui para acesso rápido ao Plano Operacional.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wider font-body">
        Suas lojas atuais
      </p>
      {stores.map((s) => (
        <div
          key={s.storeId}
          className="bg-card rounded-xl border border-primary/15 px-4 py-3 flex items-center justify-between gap-3 hover:shadow-md hover:border-primary/30"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground font-body truncate">{s.storeName}</p>
              <p className="text-xs text-muted-foreground font-body">{ROLE_LABELS[s.role]}</p>
            </div>
          </div>
          <Button size="sm" className="rounded-lg shrink-0" onClick={() => onNavigateToPlan(s.storeId)}>
            Ir para o PO
          </Button>
        </div>
      ))}
      <p className="text-xs text-center text-muted-foreground pt-1 font-body">
        Ou entre em uma nova loja abaixo
      </p>
    </div>
  );
}
