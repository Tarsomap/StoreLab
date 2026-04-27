'use client';

import { QUESTIONS_COUNT } from '../../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProgressBoardProps {
  round: 1 | 2 | 3;
  savedCount: Record<1 | 2 | 3, number>;
  loadingRound: boolean;
  onSelectRound: (r: 1 | 2 | 3) => void;
}

export function ProgressBoard({
  round,
  savedCount,
  loadingRound,
  onSelectRound,
}: ProgressBoardProps) {
  return (
    <>
      {/* Round selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Rodada:</span>
            {([1, 2, 3] as const).map((r) => (
              <Button
                key={r}
                variant={round === r ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelectRound(r)}
                disabled={loadingRound}
                className="relative"
              >
                Rodada {r}
                {savedCount[r] === QUESTIONS_COUNT && (
                  <span className="ml-1.5 text-xs opacity-80">✓</span>
                )}
              </Button>
            ))}
            <span className="ml-auto text-sm text-muted-foreground">
              {savedCount[round] === QUESTIONS_COUNT ? (
                <span className="text-green-600 font-medium">10 perguntas salvas</span>
              ) : savedCount[round] > 0 ? (
                `${savedCount[round]} de 10 perguntas salvas`
              ) : (
                'Nenhuma pergunta salva ainda'
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="text-sm text-muted-foreground bg-card border rounded-lg px-4 py-3 flex gap-2">
        <span className="text-blue-500">ℹ</span>
        <span>
          Configure exatamente <strong>10 perguntas</strong> por rodada, cada uma com{' '}
          <strong>4 opções</strong> e <strong>1 resposta correta</strong>.
          O quiz precisa estar configurado antes dos jogadores confirmarem o PO.
        </span>
      </div>
    </>
  );
}
