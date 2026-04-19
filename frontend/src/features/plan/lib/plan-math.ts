import { formatBrl } from '@/lib/format-brl';
import { CategoryDecisionEntry, CatRow, DreLines, PlanFinancials } from '../types';

/** Versão do plano no backend conforme fase da sessão (1 na primeira config/R1, 2 após reconfig, 3 na R3). */
export function configVersionFromStatus(status: string): number {
  if (status === 'ROUND_3') return 3;
  if (status === 'RECONFIGURATION' || status === 'ROUND_2') return 2;
  return 1;
}

export const brl = formatBrl;
/** Formata fração (0–1) como texto de percentual com uma casa decimal, para rótulos do DRE. */
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
/** Formata número inteiro no padrão pt-BR (milhares), usado em quantidades na tabela. */
export const num = (n: number) => n.toLocaleString('pt-BR');

export const CATEGORY_STYLE: Record<string, {
  border: string;
  text: string;
  bg: string;
  dot: string;
  inputBorder: string;
}> = {
  'Perecíveis': { border: 'border-l-cat-pereciveis', text: 'text-cat-pereciveis', bg: 'bg-cat-pereciveis/8', dot: 'bg-cat-pereciveis', inputBorder: 'focus-visible:ring-cat-pereciveis/50 border-cat-pereciveis/30' },
  'Mercearia':  { border: 'border-l-cat-mercearia',  text: 'text-cat-mercearia',  bg: 'bg-cat-mercearia/8',  dot: 'bg-cat-mercearia',  inputBorder: 'focus-visible:ring-cat-mercearia/50 border-cat-mercearia/30' },
  'Eletro':     { border: 'border-l-cat-eletro',     text: 'text-cat-eletro',     bg: 'bg-cat-eletro/8',     dot: 'bg-cat-eletro',     inputBorder: 'focus-visible:ring-cat-eletro/50 border-cat-eletro/30' },
  'Hipel':      { border: 'border-l-cat-hipel',      text: 'text-cat-hipel',      bg: 'bg-cat-hipel/8',      dot: 'bg-cat-hipel',      inputBorder: 'focus-visible:ring-cat-hipel/50 border-cat-hipel/30' },
};

/** Cores Tailwind por nome de categoria (design system do jogo). */
export function getCatStyle(name: string) {
  return CATEGORY_STYLE[name] ?? {
    border: 'border-l-muted-foreground',
    text: 'text-muted-foreground',
    bg: 'bg-muted/30',
    dot: 'bg-muted-foreground',
    inputBorder: '',
  };
}

export const SLA_RISK_KEYWORDS = ['segurança', 'freezer', 'redes', 'câmera', 'camera', 'seguranca'];

/** Heurística para avisar na UI quais CAPEX têm risco de SLA no motor (palavras-chave no nome). */
export function hasSlaRisk(name: string): boolean {
  const lower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return SLA_RISK_KEYWORDS.some((k) => lower.includes(k));
}

/** Calcula linhas de categoria com preço de venda, imposto, estoque e perdas para montar o DRE resumido na lateral. */
export function buildCatRows(cats: CategoryDecisionEntry[]): CatRow[] {
  return cats.map((c) => {
    const sellPrice = c.unitCost * (1 + c.priceMargin);
    const totalVenda = c.stockPurchased * sellPrice;
    const impostos = totalVenda * c.taxRate;
    const totalEstoque = c.stockPurchased * c.unitCost;
    const quebrasR = totalEstoque * c.breakageRate;
    const agingR = totalEstoque * c.agingRate;
    return { ...c, sellPrice, totalVenda, impostos, totalEstoque, quebrasR, agingR };
  });
}

/** Agrega vendas, CMV, quebras/envelhecimento e custos fixos do plano em um único objeto para exibir na UI. */
export function buildDre(rows: CatRow[], financials: PlanFinancials): DreLines {
  const totalVendas = rows.reduce((s, r) => s + r.totalVenda, 0);
  const impostos = rows.reduce((s, r) => s + r.impostos, 0);
  const vendaLiquida = totalVendas - impostos;
  const custoVenda = rows.reduce((s, r) => s + r.totalEstoque, 0);
  const massaMgLiquida = vendaLiquida - custoVenda;
  const quebras = rows.reduce((s, r) => s + r.quebrasR, 0);
  const aging = rows.reduce((s, r) => s + r.agingR, 0);
  const massaFinal = massaMgLiquida - quebras - aging;
  const folha = financials.payrollCost;
  const manutencao = financials.maintenanceCost;
  const juros = financials.interestCost;
  const licencas = financials.licenseCost;
  const ebitda = massaFinal - folha - manutencao - juros - licencas;
  const ebitdaPct = totalVendas > 0 ? ebitda / totalVendas : 0;
  return { totalVendas, impostos, vendaLiquida, custoVenda, massaMgLiquida, quebras, aging, massaFinal, folha, manutencao, juros, licencas, ebitda, ebitdaPct };
}
