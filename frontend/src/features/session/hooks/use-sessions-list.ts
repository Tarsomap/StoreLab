'use client';

import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '@/lib/api';
import type {
  CapexCatalogEntry,
  CapexConfigFormValues,
  CategoryCatalogEntry,
  CategoryConfigFormValues,
  Session,
} from '../types';

interface UseSessionsListResult {
  sessions: Session[];
  loading: boolean;
  categoryCatalog: CategoryCatalogEntry[];
  capexCatalog: CapexCatalogEntry[];
  categoryConfigs: Record<string, CategoryConfigFormValues>;
  capexConfigs: Record<string, CapexConfigFormValues>;
  setCategoryConfigs: Dispatch<SetStateAction<Record<string, CategoryConfigFormValues>>>;
  setCapexConfigs: Dispatch<SetStateAction<Record<string, CapexConfigFormValues>>>;
  addSession: (s: Session) => void;
  removeSession: (id: string) => void;
  updateSession: (updated: Session) => void;
}

export function useSessionsList(): UseSessionsListResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryCatalog, setCategoryCatalog] = useState<CategoryCatalogEntry[]>([]);
  const [capexCatalog, setCapexCatalog] = useState<CapexCatalogEntry[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<Record<string, CategoryConfigFormValues>>({});
  const [capexConfigs, setCapexConfigs] = useState<Record<string, CapexConfigFormValues>>({});

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
        setCategoryConfigs(
          Object.fromEntries(
            catalog.map((c) => [
              c.id,
              {
                stockAvailable: String(c.stockAvailable),
                unitCost: String(c.unitCost),
                taxRate: String(c.taxRate * 100),
                breakageRate: String(c.breakageRate * 100),
                agingRate: String(c.agingRate * 100),
              },
            ]),
          ),
        );
      })
      .catch(() => setCategoryCatalog([]));
  }, []);

  useEffect(() => {
    api
      .get<CapexCatalogEntry[]>('/sessions/catalog/capex')
      .then((catalog) => {
        setCapexCatalog(catalog);
        setCapexConfigs(
          Object.fromEntries(
            catalog.map((c) => [
              c.id,
              {
                acquisitionCost: String(c.acquisitionCost),
                downtimeFixedDays: String(c.downtimeFixedDays),
                monthlyLicenseDelta: String(c.monthlyLicenseDelta),
                maintenanceSaving: String(c.maintenanceSaving),
                slaRiskPercent: String(c.slaRiskPercent * 100),
              },
            ]),
          ),
        );
      })
      .catch(() => setCapexCatalog([]));
  }, []);

  function addSession(s: Session) {
    setSessions((prev) => [s, ...prev]);
  }

  function removeSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSession(updated: Session) {
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
    );
  }

  return {
    sessions,
    loading,
    categoryCatalog,
    capexCatalog,
    categoryConfigs,
    capexConfigs,
    setCategoryConfigs,
    setCapexConfigs,
    addSession,
    removeSession,
    updateSession,
  };
}
