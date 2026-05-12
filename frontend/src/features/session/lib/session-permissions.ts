import type { SessionStatus } from '../types';

/** Pode excluir? Backend só aceita SETUP ou FINISHED. */
export function canDeleteSession(status: SessionStatus | string): boolean {
  return status === 'SETUP' || status === 'FINISHED';
}

/** Pode editar campos além do nome? Backend só aceita SETUP. */
export function canEditFullSession(status: SessionStatus | string): boolean {
  return status === 'SETUP';
}

export const RESTRICTED_FIELD_TOOLTIP =
  'Disponível apenas em SETUP. Após criar lojas ou iniciar a partida, somente o nome pode ser editado.';

export const DELETE_BLOCKED_TOOLTIP =
  'Só é possível excluir sessões em SETUP ou FINISHED. Encerre a partida antes de deletar.';
