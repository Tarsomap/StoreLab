import { Check } from 'lucide-react';
import { PHASE_STEPS } from '../lib/session-phases';

interface PhaseStepperProps {
  activeIndex: number;
}

/** Linha de etapas (configuração → rodadas → resultado) com nó ativo e concluído. */
export function PhaseStepper({ activeIndex }: PhaseStepperProps) {
  return (
    <div className="flex w-full items-start gap-2 overflow-x-auto pb-2">
      {PHASE_STEPS.map((step, idx) => {
        const isDone = idx < activeIndex;
        const isActive = idx === activeIndex;
        return (
          <div key={step.label} className="flex min-w-[88px] items-start sm:flex-1 sm:min-w-0">
            <div className="flex shrink-0 flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isDone
                    ? 'bg-accent text-accent-foreground'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground border border-muted-foreground/20'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span
                className={`mt-1 max-w-[88px] text-center text-[11px] leading-tight whitespace-normal sm:max-w-[96px] ${
                  isActive
                    ? 'text-primary font-semibold'
                    : isDone
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/50'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < PHASE_STEPS.length - 1 && (
              <div
                className={`mt-3 h-0.5 w-8 shrink-0 sm:mx-1 sm:flex-1 ${
                  idx < activeIndex ? 'bg-accent' : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
