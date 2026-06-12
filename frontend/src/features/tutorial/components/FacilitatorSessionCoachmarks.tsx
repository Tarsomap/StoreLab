'use client';

import { useEffect, useRef } from 'react';
import type { Driver } from 'driver.js';

interface FacilitatorSessionCoachmarksProps {
  active: boolean;
  onDone: () => void;
}

const COACHMARK_STEPS = [
  {
    element: '#tutorial-f-stepper',
    popover: {
      title: 'Fases da Partida',
      description:
        'O stepper mostra em qual fase a sessão está. Cada etapa precisa ser concluída antes de avançar para a próxima.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tutorial-f-info',
    popover: {
      title: 'Informações da Sessão',
      description:
        'Aqui ficam os dados gerais da partida: demanda total, caixa inicial, número de lojas e quantos POs já foram confirmados pelos times.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tutorial-f-actions',
    popover: {
      title: 'Ações Contextuais',
      description:
        'Este painel muda conforme a fase. Quando todas as lojas confirmarem o PO, o botão de executar a rodada fica disponível aqui.',
      side: 'left' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tutorial-f-stores',
    popover: {
      title: 'Lojas da Partida',
      description:
        'Cada card representa uma loja. Copie o código de acesso e compartilhe com o time. Você também pode criar novas lojas aqui durante o SETUP.',
      side: 'top' as const,
      align: 'start' as const,
    },
  },
];

export function FacilitatorSessionCoachmarks({ active, onDone }: FacilitatorSessionCoachmarksProps) {
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
