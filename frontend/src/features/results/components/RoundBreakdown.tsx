'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatBrl } from '@/lib/format-brl';
import { TermTooltip } from '@/components/term-tooltip';
import { GlossaryTerm } from '@/lib/term-glossary';
import type { RoundResultEntry } from '../types';
import { fmtPct, fmtNum, ebitdaClass } from '../lib';

interface RoundBreakdownProps {
  round: RoundResultEntry;
  initialCash: number;
}

export function RoundBreakdown({ round, initialCash }: RoundBreakdownProps) {
  const plRows: {
    label: string;
    value: string;
    negative?: boolean;
    subtotal?: boolean;
    isEbitda?: boolean;
    term?: GlossaryTerm;
  }[] = [
    { label: 'Receita bruta', value: formatBrl(round.grossRevenue) },
    { label: 'Impostos', value: formatBrl(round.taxAmount), negative: true },
    { label: 'Receita líquida', value: formatBrl(round.netRevenue), subtotal: true },
    { label: 'Custo de mercadoria', value: formatBrl(round.costOfGoods), negative: true },
    { label: 'Quebras', value: formatBrl(round.breakageAmount), negative: true, term: 'QUEBRAS' },
    { label: 'Aging', value: formatBrl(round.agingAmount), negative: true, term: 'AGING' },
    { label: 'Folha de pagamento', value: formatBrl(round.payrollCost), negative: true },
    { label: 'Manutenção', value: formatBrl(round.maintenanceCost), negative: true },
    { label: 'Licenças', value: formatBrl(round.licenseCost), negative: true, term: 'LICENCAS' },
    { label: 'Juros', value: formatBrl(round.interestCost), negative: true, term: 'JUROS' },
    { label: 'Perda SLA', value: formatBrl(round.slaRevenueLost), negative: true, term: 'SLA_LOSS' },
    {
      label: 'EBITDA',
      value: `${formatBrl(round.ebitda)} (${fmtPct(round.ebitdaPercentage)})`,
      isEbitda: true,
      term: 'EBITDA',
    },
  ];

  const metrics: { label: string; value: string; term?: GlossaryTerm }[] = [
    { label: 'Quiz (loja)', value: `${round.quizScorePercentage.toFixed(1)}%` },
    { label: 'CSAT', value: fmtNum(round.csat), term: 'CSAT' },
    { label: 'Disponibilidade', value: fmtNum(round.availability), term: 'DISPONIBILIDADE' },
    { label: 'Preço médio', value: fmtNum(round.basketPrice) },
    { label: 'Score ranking', value: String(round.rankScore) },
    { label: 'Market share', value: fmtPct(round.demandShare), term: 'MARKET_SHARE' },
    { label: 'Caixa usado', value: formatBrl(round.cashUsed) },
  ];

  const totalCosts = round.grossRevenue - round.ebitda;
  const cashFlowRows: {
    label: string;
    value: string;
    sign: '+' | '-' | '=';
    highlight?: boolean;
    term?: GlossaryTerm;
  }[] = [
    { label: 'Caixa inicial', value: formatBrl(initialCash), sign: '+' },
    { label: 'Estoque + CAPEX (gasto)', value: formatBrl(round.cashUsed), sign: '-', term: 'CAPEX' },
    { label: 'Receita de vendas', value: formatBrl(round.grossRevenue), sign: '+' },
    { label: 'Custos operacionais', value: formatBrl(totalCosts), sign: '-' },
    { label: 'Caixa Final', value: formatBrl(round.cashFinal), sign: '=', highlight: true },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
      {/* Round header */}
      <div className="flex items-center gap-2">
        <h4 className="font-display font-bold text-sm text-foreground">
          Rodada {round.round}
        </h4>
        <span
          className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
            round.ebitdaPercentage >= 0
              ? 'bg-accent/10 text-accent'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {fmtPct(round.ebitdaPercentage)}
        </span>
        {round.ebitdaPercentage >= 0 ? (
          <TrendingUp className="w-3.5 h-3.5 text-accent" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="bg-muted/40 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              {m.label}
              {m.term && <TermTooltip term={m.term} side="top" />}
            </p>
            <p className="font-mono text-sm font-semibold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P&L */}
        <div className="rounded-lg bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Resultado (DRE)
          </p>
          <div>
            {plRows.map((row) => (
              <div
                key={row.label}
                className={`flex justify-between items-center py-1.5 border-b border-border/30 last:border-0 ${
                  row.subtotal ? '-mx-3 px-3 bg-muted/30' : ''
                } ${row.isEbitda ? 'border-t border-border/60 mt-1 pt-2' : ''}`}
              >
                <span
                  className={`text-xs flex items-center gap-1 ${
                    row.subtotal || row.isEbitda ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {row.label}
                  {row.term && <TermTooltip term={row.term} side="left" />}
                </span>
                <span
                  className={`font-mono text-xs font-medium ${
                    row.isEbitda
                      ? round.ebitdaPercentage >= 0
                        ? 'text-accent font-bold'
                        : 'text-destructive font-bold'
                      : row.negative
                        ? 'text-destructive/80'
                        : 'text-foreground'
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Flow */}
        <div className="rounded-lg bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Caixa Final
          </p>
          <div>
            {cashFlowRows.map((row, idx) => (
              <div
                key={row.label}
                className={`flex justify-between items-center py-1.5 ${
                  idx === cashFlowRows.length - 1
                    ? 'border-t-2 border-foreground/15 mt-1 pt-2'
                    : 'border-b border-border/30'
                } ${row.highlight ? '-mx-3 px-3 bg-primary/5 rounded' : ''}`}
              >
                <span
                  className={`text-xs flex items-center gap-1.5 ${
                    row.highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    className={`font-mono font-bold ${
                      row.sign === '+'
                        ? 'text-accent'
                        : row.sign === '-'
                          ? 'text-destructive'
                          : 'text-primary'
                    }`}
                  >
                    {row.sign}
                  </span>
                  {row.label}
                  {row.term && <TermTooltip term={row.term} side="left" />}
                </span>
                <span
                  className={`font-mono text-xs ${
                    row.highlight
                      ? round.cashFinal >= 0
                        ? 'font-bold text-primary'
                        : 'font-bold text-destructive'
                      : row.sign === '-'
                        ? 'text-destructive/80 font-medium'
                        : 'text-foreground/80'
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
