import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Textos amigáveis para cada valor de `SessionStatus` vindo da API. */
export const SESSION_STATUS_LABEL: Record<string, string> = {
  SETUP: 'Configuração',
  ROUND_1_CONFIG: 'Config. Rodada 1',
  ROUND_1: 'Rodada 1',
  RECONFIGURATION: 'Reconfiguração',
  ROUND_2: 'Rodada 2',
  ROUND_3: 'Rodada 3',
  FINISHED: 'Finalizada',
};

const SESSION_STATUS_CLASS: Record<string, string> = {
  SETUP: 'bg-muted text-muted-foreground border-transparent',
  ROUND_1_CONFIG: 'bg-warning/10 text-warning border-transparent',
  ROUND_1: 'bg-accent/10 text-accent border-transparent',
  RECONFIGURATION: 'bg-warning/10 text-warning border-transparent',
  ROUND_2: 'bg-accent/10 text-accent border-transparent',
  ROUND_3: 'bg-accent/10 text-accent border-transparent',
  FINISHED: 'bg-primary/10 text-primary border-transparent',
};

/**
 * Pill colorida com o estágio da partida (configuração, rodada em andamento, finalizada, etc.).
 *
 * @param status - String do enum de status da sessão.
 */
export function SessionStatusBadge({ status }: { status: string }) {
  const label = SESSION_STATUS_LABEL[status] ?? status;
  const cls =
    SESSION_STATUS_CLASS[status] ?? 'bg-muted text-muted-foreground border-transparent';
  return (
    <Badge
      variant="outline"
      className={cn('rounded-full border-0 px-2.5 py-0.5 text-xs font-medium', cls)}
    >
      {label}
    </Badge>
  );
}
