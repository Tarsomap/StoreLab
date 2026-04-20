'use client';
import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { PlanFullResponse } from '../types';

/**
 * Encapsula a conexão WebSocket da loja e registra o listener de `plan:updated`.
 * Quando outro membro altera o PO, `onUpdate` é chamado com o plano mais recente,
 * permitindo que a página atualize localmente sem recarregar.
 */
export function useRealtimePlan(
  sessionId: string | undefined,
  storeId: string,
  onUpdate: (plan: PlanFullResponse) => void,
) {
  const { on } = useSocket(sessionId, storeId);

  useEffect(() => {
    return on<{ plan: PlanFullResponse }>('plan:updated', ({ plan: updated }) => {
      onUpdate(updated);
    });
  }, [on, onUpdate]);
}
