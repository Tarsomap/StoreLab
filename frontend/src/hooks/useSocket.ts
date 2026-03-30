'use client';

import { useEffect, useLayoutEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

type SocketPool = { socket: Socket; token: string; refs: number };

let pool: SocketPool | null = null;

/** Abre ou reutiliza uma única conexão Socket.io por token (vários componentes compartilham a mesma “linha ao vivo”). */
function acquireSocket(token: string): Socket {
  if (pool && pool.token !== token) {
    pool.socket.disconnect();
    pool = null;
  }
  if (!pool) {
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    pool = { socket, token, refs: 0 };
  }
  pool.refs += 1;
  return pool.socket;
}

/** Quando o último hook desmonta, desliga o socket para não manter canal aberto à toa. */
function releaseSocket(): void {
  if (!pool) return;
  pool.refs -= 1;
  if (pool.refs <= 0) {
    pool.socket.disconnect();
    pool = null;
  }
}

export type SocketConnectionState = 'connected' | 'reconnecting' | 'disconnected';

/**
 * Lê se a conexão tempo real está verde, amarela (tentando de novo) ou vermelha — usado no ponto da TopBar.
 * Usa `useLayoutEffect` para alinhar o estado antes de pintar a tela e evitar um flash “desconectado” quando o pool já está ligado.
 */
export function useSocketConnectionState(): SocketConnectionState {
  const token = useAuthStore((s) => s.token);
  const [state, setState] = useState<SocketConnectionState>('disconnected');

  useLayoutEffect(() => {
    if (!token) {
      setState('disconnected');
      return;
    }

    const socket = acquireSocket(token);

    // O evento `connect` pode ter disparado antes de registrarmos listeners — consultamos `connected` na hora.
    setState(socket.connected ? 'connected' : 'disconnected');

    const onConnect = () => setState('connected');
    const onDisconnect = () => setState('disconnected');
    const onReconnectAttempt = () => setState('reconnecting');
    const onReconnect = () => setState('connected');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);
    socket.on('reconnect', onReconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      socket.off('reconnect', onReconnect);
      releaseSocket();
    };
  }, [token]);

  return state;
}

/**
 * Conecta ao servidor WebSocket com o JWT atual e entra nas salas `session` e/ou `store` (e lojas extras se precisar).
 * **Por que separado do componente:** qualquer tela pode ouvir `plan:updated` ou `round:results` sem duplicar lógica de conexão.
 * **Eventos:** `on(event, handler)` retorna função de cleanup ao desmontar — o backend emite para quem está na sala correspondente.
 *
 * @param sessionId - Se informado, após `connect` envia `join:session` (recebe `round:started`, `round:results`, etc. para toda a partida).
 * @param storeId - Se informado, envia `join:store` (recebe `plan:updated`, `sla:event`, `quiz:player-answered` daquela loja).
 * @param extraStoreIds - Facilitador pode ouvir várias lojas (ex.: progresso de quiz) entrando em cada sala `store:*`.
 */
export function useSocket(
  sessionId?: string,
  storeId?: string,
  /** Salas `store:*` adicionais (ex.: facilitador ouvindo `quiz:player-answered` de todas as lojas). */
  extraStoreIds?: readonly string[],
) {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const extraJoinKey = extraStoreIds?.length ? [...extraStoreIds].sort().join('\0') : '';

  useEffect(() => {
    if (!token) {
      socketRef.current = null;
      return;
    }

    const socket = acquireSocket(token);
    socketRef.current = socket;

    const flushJoins = () => {
      if (sessionId) socket.emit('join:session', { sessionId });
      if (storeId) socket.emit('join:store', { storeId });
      if (extraStoreIds?.length) {
        for (const id of extraStoreIds) {
          socket.emit('join:store', { storeId: id });
        }
      }
    };

    socket.on('connect', flushJoins);
    if (socket.connected) flushJoins();

    return () => {
      socket.off('connect', flushJoins);
      releaseSocket();
      socketRef.current = null;
    };
  }, [token, sessionId, storeId, extraJoinKey]);

  const on = useCallback(<T,>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return { socketRef, on };
}
