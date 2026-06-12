'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const STEPS = [
  {
    icon: '🗂️',
    title: 'Gestão da Sessão',
    content:
      'Aqui você controla tudo de uma partida: cria as lojas, distribui os códigos de acesso e avança as fases do jogo conforme os times completam suas etapas.',
  },
  {
    icon: '📍',
    title: 'Fases da Partida',
    content:
      'A partida percorre um caminho fixo:\n\n• SETUP → times entram e o facilitador cria as lojas\n• Rodadas 1, 2 e 3 → cada time preenche o PO, responde o quiz e aguarda o motor calcular\n• Reconfiguração → entre rodadas, transferências de jogadores são realizadas\n• FINISHED → resultados finais liberados',
  },
  {
    icon: '🏪',
    title: 'Lojas e Códigos de Acesso',
    content:
      'Crie até 4 lojas e compartilhe os códigos de acesso com cada time. Os jogadores entram pelo código e escolhem seu papel (Gerente, Compras, Operações, Financeiro, Marketing).',
  },
  {
    icon: '⚡',
    title: 'Ações Contextuais',
    content:
      'O painel de Ações muda conforme a fase atual:\n\n• Em SETUP: avançar para a Rodada 1\n• Em rodadas: aguardar todos os POs confirmados e executar o cálculo\n• Em RECONFIGURATION: gerenciar transferências antes de avançar',
  },
  {
    icon: '✅',
    title: 'Avançando Rodadas',
    content:
      'Quando todas as lojas confirmarem o Plano Operacional e responderem o quiz, execute o motor de cálculo para gerar os resultados. Depois avance para a próxima fase.\n\nAgora vamos destacar os principais elementos da tela.',
  },
] as const;

interface FacilitatorSessionModalProps {
  open: boolean;
  onFinish: () => void;
  onSkip: () => void;
}

export function FacilitatorSessionModal({ open, onFinish, onSkip }: FacilitatorSessionModalProps) {
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
