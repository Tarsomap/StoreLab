'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function useSocket(sessionId?: string, storeId?: string) {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (sessionId) socket.emit('join:session', { sessionId });
      if (storeId) socket.emit('join:store', { storeId });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, sessionId, storeId]);

  const on = useCallback(
    <T>(event: string, handler: (data: T) => void) => {
      socketRef.current?.on(event, handler);
      return () => { socketRef.current?.off(event, handler); };
    },
    [],
  );

  return { socketRef, on };
}
