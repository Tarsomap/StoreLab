import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SessionStatus } from '../types';

export interface ContextualActionsProps {
  status: SessionStatus;
  allConfirmed: boolean;
  advancing: boolean;
  executing: boolean;
  sessionId: string;
  onAdvance: () => void;
  onExecute: () => void;
  onNavigate: (path: string) => void;
}

/**
 * Botões "Avançar" / "Executar rodada" / links para quiz, transferências e resultados conforme `status`.
 * API: `onAdvance` → PATCH advance; `onExecute` → POST execute (dispara motor no backend).
 */
export function ContextualActions({
  status,
  allConfirmed,
  advancing,
  executing,
  sessionId,
  onAdvance,
  onExecute,
  onNavigate,
}: ContextualActionsProps) {
  const busy = advancing || executing;

  switch (status) {
    case 'SETUP':
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Crie as 4 lojas e aguarde os times entrarem antes de iniciar.
          </p>
          <Button className="w-full" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Iniciando...' : 'Iniciar 1ª Configuração →'}
          </Button>
        </div>
      );

    case 'ROUND_1_CONFIG':
      return (
        <div className="space-y-2">
          {allConfirmed ? (
            <p className="text-xs text-accent bg-accent/10 rounded px-2 py-1.5 border border-accent/20">
              Todas as lojas confirmaram o PO.
            </p>
          ) : (
            <p className="text-xs text-warning bg-warning/10 rounded px-2 py-1.5 border border-warning/20 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Aguardando confirmação de todos os POs...
            </p>
          )}
          <Button
            className="w-full shadow-sm hover:bg-accent/90"
            onClick={onAdvance}
            disabled={busy || !allConfirmed}
          >
            {advancing ? 'Iniciando...' : 'Iniciar Rodada 1 →'}
          </Button>
        </div>
      );

    case 'ROUND_1':
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Execute o motor de cálculo após todas as lojas confirmarem.
          </p>
          <Button className="w-full" onClick={onExecute} disabled={busy}>
            {executing ? 'Executando...' : 'Executar Rodada 1'}
          </Button>
          <Button className="w-full" variant="outline" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Avançando...' : 'Avançar para Reconfiguração →'}
          </Button>
        </div>
      );

    case 'RECONFIGURATION':
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Gerencie as transferências obrigatórias entre lojas.
          </p>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => onNavigate(`/dashboard/session/${sessionId}/transfers`)}
          >
            Gerenciar Transferências
          </Button>
          <Button className="w-full" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Iniciando...' : 'Iniciar 2ª Configuração →'}
          </Button>
        </div>
      );

    case 'ROUND_2':
      return (
        <div className="space-y-2">
          <Button className="w-full" onClick={onExecute} disabled={busy}>
            {executing ? 'Executando...' : 'Executar Rodada 2'}
          </Button>
          <Button className="w-full" variant="outline" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Avançando...' : 'Avançar para Rodada 3 →'}
          </Button>
        </div>
      );

    case 'ROUND_3':
      return (
        <div className="space-y-2">
          <Button className="w-full" onClick={onExecute} disabled={busy}>
            {executing ? 'Executando...' : 'Executar Rodada 3'}
          </Button>
          <Button className="w-full" variant="outline" onClick={onAdvance} disabled={busy}>
            {advancing ? 'Finalizando...' : 'Finalizar Sessão →'}
          </Button>
        </div>
      );

    case 'FINISHED':
      return (
        <div className="space-y-2">
          <p className="text-xs text-accent bg-accent/10 rounded px-2 py-1.5 border border-accent/25">
            Sessão finalizada. Confira o placar final!
          </p>
          <Button
            className="w-full"
            onClick={() => onNavigate(`/session/${sessionId}/results`)}
          >
            Ver Resultado Final →
          </Button>
        </div>
      );
  }
}
