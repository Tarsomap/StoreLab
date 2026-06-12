'use client';

import { useEffect, useRef } from 'react';
import type { Driver } from 'driver.js';

interface TutorialACoachmarksProps {
  active: boolean;
  onDone: () => void;
}

const COACHMARK_STEPS = [
  {
    element: '#tutorial-otp',
    popover: {
      title: 'Código de Acesso',
      description:
        'Digite ou cole o código de 6 caracteres fornecido pelo facilitador. Você também pode colar o código completo no primeiro campo.',
      side: 'bottom' as const,
      align: 'center' as const,
    },
  },
  {
    element: '#tutorial-role',
    popover: {
      title: 'Seu Papel na Loja',
      description:
        'Escolha o papel que você vai exercer nesta rodada. Cada papel tem responsabilidades e permissões diferentes no Plano Operacional.',
      side: 'top' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tutorial-submit',
    popover: {
      title: 'Entrar na Loja',
      description:
        'Com o código preenchido e o papel escolhido, clique aqui para entrar. Você será direcionado ao Plano Operacional da sua loja.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },
];

export function TutorialACoachmarks({ active, onDone }: TutorialACoachmarksProps) {
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
