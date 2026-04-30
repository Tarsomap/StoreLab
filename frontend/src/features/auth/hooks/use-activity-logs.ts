"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

interface ActivityLogsFilters {
  sessionId: string;
  storeId?: string;
}

/**
 * Busca audit logs filtrados por sessao e (opcionalmente) loja.
 * Retorna array vazio se sessionId for falsy.
 */
export function useActivityLogs(filters: ActivityLogsFilters) {
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { sessionId, storeId } = filters;

  useEffect(() => {
    if (!sessionId) {
      setData([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("sessionId", sessionId);
    if (storeId) params.set("storeId", storeId);

    api
      .get<AuditLogEntry[]>(`/audit-logs?${params.toString()}`)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
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
  }, [sessionId, storeId]);

  return { data, isLoading, error };
}

