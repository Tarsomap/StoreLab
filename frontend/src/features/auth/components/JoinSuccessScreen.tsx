import { Button } from '@/components/ui/button';
import type { JoinResponse, StoreRole } from '../types';
import { ROLE_LABELS } from '../types';

interface JoinSuccessScreenProps {
  joined: JoinResponse;
  role: StoreRole;
  onGoToPlan: () => void;
  onJoinAnother: () => void;
}

/** Tela de confirmação após entrar com sucesso em uma loja. */
export function JoinSuccessScreen({ joined, role, onGoToPlan, onJoinAnother }: JoinSuccessScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 join-success-enter max-w-sm mx-auto">
      <div className="relative">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, hsl(142 71% 45% / 0.15), hsl(142 71% 45% / 0.06))',
            border: '2px solid hsl(142 71% 45% / 0.4)',
            boxShadow: '0 0 40px hsl(142 71% 45% / 0.2)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-11 h-11 check-icon-pop"
            fill="none"
            stroke="hsl(142 71% 45%)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">
          Entrada confirmada
        </p>
        <h2 className="font-display font-bold text-2xl text-foreground leading-tight">
          {joined.name}
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          Papel: <span className="font-semibold text-foreground">{ROLE_LABELS[role]}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
        <svg className="animate-spin w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Redirecionando para o Plano Operacional...
      </div>

      <div className="flex flex-col gap-2 w-full">
        <Button className="w-full rounded-xl" onClick={onGoToPlan}>
          Ir para o PO agora
        </Button>
        <Button variant="outline" className="w-full rounded-xl" onClick={onJoinAnother}>
          Entrar em outra loja
        </Button>
      </div>
    </div>
  );
}
