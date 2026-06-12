'use client';

import { useEffect, useRef } from 'react';
import type { Driver } from 'driver.js';

interface TutorialBCoachmarksProps {
  active: boolean;
  onDone: () => void;
}

const COACHMARK_STEPS = [
  {
    element: '#tutorial-dre',
    popover: {
      title: 'DRE — Resultado da Loja',
      description:
        'Aqui você acompanha o EBITDA e o Caixa Disponível em tempo real enquanto preenche o plano.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tutorial-category-table',
    popover: {
      title: 'Estoque e Margem',
      description:
        'Defina quanto comprar de cada categoria e a margem de preço. O DRE atualiza instantaneamente.',
      side: 'top' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tutorial-operators',
    popover: {
      title: 'Operadores',
      description:
        'Configure o número de operadores de caixa e de serviço. Mais operadores reduzem filas, mas aumentam custos salariais.',
      side: 'top' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tutorial-capex',
    popover: {
      title: 'CAPEX — Investimentos',
      description:
        'Ative equipamentos e melhorias que impactam os custos e o desempenho da loja ao longo das rodadas.',
      side: 'top' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tutorial-confirm',
    popover: {
      title: 'Confirmar PO',
      description:
        'Quando sua equipe estiver de acordo, confirme o Plano Operacional. Após a confirmação o facilitador avança a rodada.',
      side: 'top' as const,
      align: 'end' as const,
    },
  },
];

export function TutorialBCoachmarks({ active, onDone }: TutorialBCoachmarksProps) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const activeRef = useRef(false);

  useEffect(() => {
    if (!active || activeRef.current) return;
    activeRef.current = true;

    let destroyed = false;
    let driverObj: Driver | null = null;

    import('driver.js').then(({ driver }) => {
      if (destroyed) return;

      driverObj = driver({
        showProgress: true,
        nextBtnText: 'Próximo →',
        prevBtnText: '← Anterior',
        doneBtnText: 'Entendido!',
        progressText: '{{current}} de {{total}}',
        steps: COACHMARK_STEPS,
        onDestroyed: () => {
          activeRef.current = false;
          doneRef.current();
        },
      });

      driverObj.drive();
    });

    return () => {
      destroyed = true;
      activeRef.current = false;
      try { driverObj?.destroy(); } catch { /* already destroyed */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return null;
}
