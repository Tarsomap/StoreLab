import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag } from 'lucide-react';
import { CatRow, StockAvailabilityEntry, PlanFullResponse } from '../types';
import { brl, pct, num, getCatStyle } from '../lib/plan-math';
import { CatTableRow } from './CatTableRow';
import { StockInput } from './StockInput';
import { MarginInput } from './MarginInput';

export function PlanCategoryTable({
  rows,
  plan,
  stockAvailMap,
  editable,
  saving,
  onCategoryDecision,
  onMutate,
}: {
  rows: CatRow[];
  plan: PlanFullResponse;
  stockAvailMap: Map<string, StockAvailabilityEntry>;
  editable: boolean;
  saving: boolean;
  onCategoryDecision: (categoryId: string, stockPurchased: number, priceMargin: number) => void;
  onMutate: (path: string, body: unknown) => void;
}) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
          <ShoppingBag className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-display">
          Decisões por Categoria
        </h2>
      </div>
      <Separator />
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-44">
                Campo
              </th>
              {rows.map((r) => {
                const style = getCatStyle(r.categoryName);
                return (
                  <th key={r.categoryId} className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                      <span className={`text-xs font-bold ${style.text}`}>{r.categoryName}</span>
                    </div>
                  </th>
                );
              })}
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <CatTableRow label="Custo Unit." rows={rows} getValue={(r) => brl(r.unitCost)} muted />

            {/* Posição Estoque — EDITABLE */}
            <tr className="border-b">
              <td className="px-4 py-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                  Posição Estoque (un)
                </span>
              </td>
              {rows.map((r) => {
                const avail = stockAvailMap.get(r.categoryId);
                const maxForStore = avail ? avail.remaining + r.stockPurchased : undefined;
                const catStyle = getCatStyle(r.categoryName);
                return (
                  <td key={r.categoryId} className={`px-2 py-2 text-right border-l-2 ${catStyle.border}`}>
                    <StockInput
                      value={r.stockPurchased}
                      disabled={!editable || saving}
                      maxAvailable={maxForStore}
                      catInputClass={catStyle.inputBorder}
                      onCommit={(v) => onCategoryDecision(r.categoryId, v, r.priceMargin)}
                    />
                  </td>
                );
              })}
              <td className="px-4 py-2 text-right">
                <span className="font-mono text-sm font-semibold">
                  {num(rows.reduce((s, r) => s + r.stockPurchased, 0))}
                </span>
              </td>
            </tr>

            {/* Margem Comercial — EDITABLE */}
            <tr className="border-b">
              <td className="px-4 py-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                  Margem Comercial
                </span>
              </td>
              {rows.map((r) => {
                const catStyle = getCatStyle(r.categoryName);
                return (
                  <td key={r.categoryId} className={`px-2 py-2 text-right border-l-2 ${catStyle.border}`}>
                    <MarginInput
                      value={r.priceMargin}
                      disabled={!editable || saving}
                      catInputClass={catStyle.inputBorder}
                      onCommit={(v) =>
                        onMutate(`/plans/${plan.id}/category-decision`, {
                          categoryId: r.categoryId,
                          stockPurchased: r.stockPurchased,
                          priceMargin: v,
                        })
                      }
                    />
                  </td>
                );
              })}
              <td className="px-4 py-2 text-right text-muted-foreground text-xs font-mono">—</td>
            </tr>

            <CatTableRow label="R$ Total Venda" rows={rows} getValue={(r) => brl(r.totalVenda)} total={(r) => r.totalVenda} bold />
            <CatTableRow label="R$ Impostos" rows={rows} getValue={(r) => brl(r.impostos)} total={(r) => r.impostos} muted />
            <CatTableRow label="Total Estoque R$" rows={rows} getValue={(r) => brl(r.totalEstoque)} total={(r) => r.totalEstoque} muted />

            <tr>
              <td colSpan={rows.length + 2} className="px-4 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">Perdas</span>
                  <Separator className="flex-1 bg-border/40" />
                </div>
              </td>
            </tr>

            <CatTableRow label="% Quebras" rows={rows} getValue={(r) => pct(r.breakageRate)} muted />
            <CatTableRow label="R$ Quebras" rows={rows} getValue={(r) => brl(r.quebrasR)} total={(r) => r.quebrasR} muted />
            <CatTableRow label="% Aging" rows={rows} getValue={(r) => pct(r.agingRate)} muted />
            <CatTableRow label="R$ Aging" rows={rows} getValue={(r) => brl(r.agingR)} total={(r) => r.agingR} muted />
          </tbody>
        </table>
      </div>
    </Card>
  );
}
