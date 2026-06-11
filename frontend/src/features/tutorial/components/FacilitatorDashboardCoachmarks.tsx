'use client';

import { useEffect, useRef } from 'react';

interface FacilitatorDashboardCoachmarksProps {
  active: boolean;
  onDone: () => void;
}

const COACHMARK_STEPS = [
  {
    element: '#tutorial-f-create-btn',
    popover: {
      title: 'Criar Nova Sessão',
      description:
        'Clique aqui para criar uma nova partida. Você vai definir o nome, a demanda total e o caixa inicial de cada loja.',
      side: 'bottom' as const,
      align: 'end' as const,
    },
  },
  {
    element: '#tutorial-f-kpis',
    popover: {
      title: 'Visão Geral',
      description:
        'Esses cards mostram um resumo rápido: total de sessões criadas, quantas estão ativas e o número de lojas treinadas.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tutorial-f-sessions',
    popover: {
      title: 'Sessões Ativas',
      description:
        'Todas as partidas em andamento aparecem aqui. Clique em qualquer card para acessar a gestão da sessão — criar lojas, avançar fases e acompanhar os POs.',
      side: 'top' as const,
      align: 'start' as const,
    },
  },
];

export function FacilitatorDashboardCoachmarks({ active, onDone }: FacilitatorDashboardCoachmarksProps) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const activeRef = useRef(false);

  useEffect(() => {
    if (!active || activeRef.current) return;
    activeRef.current = true;

    let destroyed = false;

    import('driver.js').then(({ driver }) => {
      if (destroyed) return;

      const driverObj = driver({
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

      return () => {
        destroyed = true;
        try { driverObj.destroy(); } catch { /* already destroyed */ }
      };
    });

    return () => {
      destroyed = true;
      activeRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return null;
}
