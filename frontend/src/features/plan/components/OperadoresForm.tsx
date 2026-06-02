'use client';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { brl } from '../lib/plan-math';

/**
 * Bloco de operadores de caixa e serviço com custo estimado, barra de "CSAT (caixa)" e total da folha.
 * Props: contagens atuais, `editable`/`saving`, `onSave(cashier, service)` quando o usuário termina de editar um campo.
 * Papel no jogo: Operational Manager ajusta headcount; o custo usa a configuração da sessão e o indicador lembra a meta de 10 caixas para CSAT.
 */
export function OperadoresForm({
  cashierOperators,
  serviceOperators,
  cashierSalary,
  serviceSalary,
  editable,
  saving,
  onSave,
}: {
  cashierOperators: number;
  serviceOperators: number;
  cashierSalary: number;
  serviceSalary: number;
  editable: boolean;
  saving: boolean;
  onSave: (cashier: number, service: number) => void;
}) {
  const [cashier, setCashier] = useState(String(cashierOperators));
  const [service, setService] = useState(String(serviceOperators));

  useEffect(() => setCashier(String(cashierOperators)), [cashierOperators]);
  useEffect(() => setService(String(serviceOperators)), [serviceOperators]);

  /** Converte strings dos inputs em números e chama `onSave` só se ambos forem válidos — evita salvar estado quebrado a cada tecla. */
  function commit(newCashier: string, newService: string) {
    const c = Number(newCashier);
    const s = Number(newService);
    if (!isNaN(c) && !isNaN(s)) onSave(c, s);
  }

  const cashierCost = Number(cashier) * cashierSalary;
  const serviceCost = Number(service) * serviceSalary;
  const totalFolha = cashierCost + serviceCost;

  // CSAT hint: 10 caixas = máximo
  const cashierNum = Number(cashier);
  const csatPct = Math.min((cashierNum / 10) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Caixa */}
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
            Operadores de Caixa
          </label>
          <div className="flex items-center gap-2 mb-1.5">
            <Input
              type="number"
              min={0}
              max={10}
              value={cashier}
              onChange={(e) => setCashier(e.target.value)}
              onBlur={(e) => commit(e.target.value, service)}
              disabled={!editable || saving}
              className="w-20 h-8 text-sm text-right font-mono disabled:bg-muted/50 disabled:cursor-default"
            />
            <span className="text-sm font-mono font-semibold text-foreground">
              = {brl(cashierCost)}
            </span>
          </div>
          {/* CSAT indicator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">CSAT (caixa)</span>
              <span className={`text-[10px] font-mono font-semibold
                ${csatPct >= 80 ? 'text-accent' : csatPct >= 50 ? 'text-warning' : 'text-destructive'}`}>
                {csatPct.toFixed(0)}%
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500
                  ${csatPct >= 80 ? 'bg-accent' : csatPct >= 50 ? 'bg-warning' : 'bg-destructive'}`}
                style={{ width: `${csatPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Serviço */}
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
            Operadores de Serviço
          </label>
          <div className="flex items-center gap-2 mb-1.5">
            <Input
              type="number"
              min={0}
              max={5}
              value={service}
              onChange={(e) => setService(e.target.value)}
              onBlur={(e) => commit(cashier, e.target.value)}
              disabled={!editable || saving}
              className="w-20 h-8 text-sm text-right font-mono disabled:bg-muted/50 disabled:cursor-default"
            />
            <span className="text-sm font-mono font-semibold text-foreground">
              = {brl(serviceCost)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">0–5 define SLA de resolução</p>
        </div>
      </div>

      {/* Total folha */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground">Total Folha de Pagamento</span>
        <span className="font-mono text-sm font-bold text-foreground">
          {brl(totalFolha)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Ideal: 10 caixas para CSAT máximo · Serviço 0–5 define SLA de resolução
      </p>
    </div>
  );
}
