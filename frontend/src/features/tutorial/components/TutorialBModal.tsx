'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const STEPS = [
  {
    icon: '🏪',
    title: 'Bem-vindo ao StoreLab',
    content:
      // [PLACEHOLDER — Tarso fornece o conteúdo conforme spec.md v1.1]
      'Nesta plataforma, você e sua equipe vão tomar decisões operacionais que afetam o resultado financeiro da loja. O objetivo é maximizar o EBITDA acumulado ao longo das rodadas.',
  },
  {
    icon: '📋',
    title: 'Suas Decisões',
    content:
      // [PLACEHOLDER — texto das regras do jogo]
      'Cada rodada você decide:\n\n• Estoque por categoria (Perecíveis, Mercearia, Eletro, Hipel)\n• Margem de preço por categoria\n• Número de operadores de caixa e de serviço\n• Investimentos em CAPEX',
  },
  {
    icon: '📊',
    title: 'O Resultado (DRE)',
    content:
      // [PLACEHOLDER — explicação do DRE]
      'O DRE mostra a projeção financeira em tempo real enquanto você preenche o plano. Acompanhe o EBITDA e o Caixa Disponível para tomar decisões mais assertivas.',
  },
  {
    icon: '🎯',
    title: 'Quiz e CSAT',
    content:
      // [PLACEHOLDER — explicação do quiz e CSAT]
      'Após definir o plano, responda o quiz da rodada. Sua pontuação influencia o CSAT (satisfação do cliente), que por sua vez afeta a demanda da sua loja.',
  },
  {
    icon: '✅',
    title: 'Confirme o PO',
    content:
      // [PLACEHOLDER — instrução de confirmação]
      'Quando sua equipe estiver de acordo, confirme o Plano Operacional. Após a confirmação, o facilitador avança a rodada e o motor de cálculo processa os resultados.\n\nAgora vamos destacar os principais elementos da tela.',
  },
] as const;

interface TutorialBModalProps {
  open: boolean;
  onFinish: () => void;
  onSkip: () => void;
}

export function TutorialBModal({ open, onFinish, onSkip }: TutorialBModalProps) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  function handleNext() {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      onFinish();
    }
  }

  function handlePrev() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSkip(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Progress + close */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="flex gap-1.5 items-center">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-primary'
                    : i < step
                    ? 'w-1.5 bg-primary/40'
                    : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onSkip}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Pular tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step content */}
        <div className="px-6 pt-5 pb-2 min-h-[220px]">
          <div className="text-4xl mb-4 leading-none">{current.icon}</div>
          <h2 className="font-display font-bold text-xl text-foreground mb-3">
            {current.title}
          </h2>
          <p className="font-body text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {current.content}
          </p>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground font-body">
            {step + 1} de {total}
          </span>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="rounded-xl gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              className="rounded-xl gap-1"
            >
              {step === total - 1 ? (
                'Começar'
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
