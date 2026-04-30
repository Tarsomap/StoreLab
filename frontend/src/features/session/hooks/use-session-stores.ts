"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface StoreBasic {
  storeId: string;
  storeName: string;
}

interface SessionStatusResponse {
  stores: StoreBasic[];
}

/**
 * Busca lojas de uma sessao especifica.
 * Retorna array vazio se sessionId for falsy ou em caso de erro.
 */
export function useSessionStores(sessionId: string) {
  const [data, setData] = useState<StoreBasic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setData([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    api
      .get<SessionStatusResponse>(`/sessions/${sessionId}/status`)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result.stores);
        }
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) {
          setError(e);
          setData([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [sessionId]);

  return { data, isLoading, error };
}

export type { StoreBasic };

