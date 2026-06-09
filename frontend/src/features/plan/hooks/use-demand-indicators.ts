import { useState, useCallback, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { StoreDemandIndicators } from "../components/DemandIndicatorsCard";

export interface UseDemandIndicatorsResult {
  data: StoreDemandIndicators | null;
  isLoading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

export function useDemandIndicators(
  storeId: string | undefined,
  round: number | undefined,
): UseDemandIndicatorsResult {
  const [data, setData] = useState<StoreDemandIndicators | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    if (!storeId || round === undefined) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const responseData = await api.get<StoreDemandIndicators | null>(
        `/results/store/${storeId}/round/${round}`,
      );
      setData(responseData);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Erro ao carregar indicadores",
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, round]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
