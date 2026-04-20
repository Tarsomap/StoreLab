'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Session, CategoryCatalogEntry } from '../types';

interface UseSessionsListResult {
  sessions: Session[];
  loading: boolean;
  categoryCatalog: CategoryCatalogEntry[];
  categoryStocks: Record<string, string>;
  setCategoryStocks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addSession: (s: Session) => void;
}

export function useSessionsList(): UseSessionsListResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryCatalog, setCategoryCatalog] = useState<CategoryCatalogEntry[]>([]);
  const [categoryStocks, setCategoryStocks] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get<Session[]>('/sessions')
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api
      .get<CategoryCatalogEntry[]>('/sessions/catalog/categories')
      .then((catalog) => {
        setCategoryCatalog(catalog);
        setCategoryStocks(
          Object.fromEntries(catalog.map((c) => [c.id, String(c.stockAvailable)])),
        );
      })
      .catch(() => setCategoryCatalog([]));
  }, []);

  function addSession(s: Session) {
    setSessions((prev) => [s, ...prev]);
  }

  return { sessions, loading, categoryCatalog, categoryStocks, setCategoryStocks, addSession };
}
