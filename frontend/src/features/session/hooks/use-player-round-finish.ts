'use client';

import { api } from '@/lib/api';

/**
 * Registra o término antecipado do jogador na rodada.
 * O backend salva horário de finalização, tempo restante e status do jogador.
 * Chamado em background ao confirmar o PO enquanto o timer está ativo.
 */
export function usePlayerRoundFinish() {
  async function finish(sessionId: string): Promise<void> {
    await api.post(`/sessions/${sessionId}/timer/finish`, {});
  }

  return { finish };
}
