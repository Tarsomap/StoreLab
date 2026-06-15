'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatBrl } from '@/lib/format-brl';
import { RandomEventOccurrence } from '../types';
import { getProtectingCapexLabels } from '../capex-protection';

interface RandomEventModalProps {
  round: number;
  events: RandomEventOccurrence[];
  onClose: () => void;
}

function ImpactLines({ impact }: { impact: RandomEventOccurrence['impact'] }) {
  const lines: string[] = [];

  if (impact.daysDown > 0)
    lines.push(`${impact.daysDown} dia(s) de operação paralisada`);
  if (impact.revenueLost > 0)
    lines.push(`Receita perdida: ${formatBrl(impact.revenueLost)}`);
  if (impact.penaltyAmount > 0)
    lines.push(`Multa: ${formatBrl(impact.penaltyAmount)}`);
  if (impact.csatPenalty > 0)
    lines.push(`CSAT reduzido em ${(impact.csatPenalty * 100).toFixed(0)} pontos`);
  if (impact.demandPenaltyFactor > 0)
    lines.push(`Demanda reduzida em ${(impact.demandPenaltyFactor * 100).toFixed(0)}%`);
  if (impact.demandBonusFactor > 0)
    lines.push(`Bônus de demanda: +${(impact.demandBonusFactor * 100).toFixed(0)}%`);
  if (impact.inventoryLossAllPercent > 0)
    lines.push(`Estoque perdido (todas as categorias): ${(impact.inventoryLossAllPercent * 100).toFixed(0)}%`);
  if (impact.inventoryLossPereciveisPercent > 0)
    lines.push(`Estoque de Perecíveis perdido: ${(impact.inventoryLossPereciveisPercent * 100).toFixed(0)}%`);
  if (impact.stockReductionPercent > 0)
    lines.push(`Pedido recebido com ${(impact.stockReductionPercent * 100).toFixed(0)}% de redução`);
  if (impact.costIncreasePercent > 0)
    lines.push(`CMV aumentou ${(impact.costIncreasePercent * 100).toFixed(0)}% em todas as categorias`);
  if (impact.overflowCsatPenalty > 0)
    lines.push(`Penalidade de fila: CSAT −${(impact.overflowCsatPenalty * 100).toFixed(1)} ponto(s)`);

  if (lines.length === 0) return null;

  return (
    <ul className="mt-1 space-y-0.5">
      {lines.map((line) => (
        <li key={line} className="text-xs font-mono text-muted-foreground">
          • {line}
        </li>
      ))}
    </ul>
  );
}

function isPositiveEvent(type: string): boolean {
  return type === 'DEMAND_SURGE';
}

export function RandomEventModal({ round, events, onClose }: RandomEventModalProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Eventos da Rodada {round}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Os seguintes eventos ocorreram e afetaram os resultados da sua loja.
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {events.map((event, idx) => {
            const positive = isPositiveEvent(event.type);
            const protectingCapex = getProtectingCapexLabels(event.type);
            return (
              <div key={event.type}>
                {idx > 0 && <Separator className="mb-3" />}
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg" aria-hidden>
                    {positive ? '📈' : '⚠️'}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        positive ? 'text-accent' : 'text-destructive'
                      }`}
                    >
                      {event.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.description}
                    </p>
                    <ImpactLines impact={event.impact} />
                    {!positive && protectingCapex.length > 0 && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        💡 Mitigável com CAPEX:{' '}
                        <span className="font-medium text-foreground">
                          {protectingCapex.join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
