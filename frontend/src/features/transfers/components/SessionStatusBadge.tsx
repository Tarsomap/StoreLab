import { Badge } from '@/components/ui/badge';

interface SessionStatusBadgeProps {
  canAdvance: boolean;
}

export function SessionStatusBadge({ canAdvance }: SessionStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={
        canAdvance
          ? 'border-accent/30 bg-accent/10 text-accent'
          : 'border-warning/30 bg-warning/10 text-warning'
      }
    >
      {canAdvance ? 'Pronto para avançar para Rodada 2' : 'Ainda pendente'}
    </Badge>
  );
}
