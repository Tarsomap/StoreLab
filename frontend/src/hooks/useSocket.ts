'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type SocketPool = { socket: Socket; token: string; refs: number };

let pool: SocketPool | null = null;

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

function releaseSocket(): void {
  if (!pool) return;
  pool.refs -= 1;
  if (pool.refs <= 0) {
    pool.socket.disconnect();
    pool = null;
  }
}

export type SocketConnectionState = 'connected' | 'reconnecting' | 'disconnected';

/** Estado da conexão Socket.io compartilhada (mesmo socket que useSocket). */
export function useSocketConnectionState(): SocketConnectionState {
  const token = useAuthStore((s) => s.token);
  const [state, setState] = useState<SocketConnectionState>('disconnected');

  useEffect(() => {
    if (!token) {
      setState('disconnected');
      return;
    }

    const socket = acquireSocket(token);

    const onConnect = () => setState('connected');
    const onDisconnect = () => setState('disconnected');
    const onReconnectAttempt = () => setState('reconnecting');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);

    if (socket.connected) setState('connected');
    else setState('disconnected');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      releaseSocket();
    };
  }, [token]);

  return state;
}

export function useSocket(sessionId?: string, storeId?: string) {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);

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
    };

    socket.on('connect', flushJoins);
    if (socket.connected) flushJoins();

    return () => {
      socket.off('connect', flushJoins);
      releaseSocket();
      socketRef.current = null;
    };
  }, [token, sessionId, storeId]);

  const on = useCallback(<T,>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return { socketRef, on };
}
