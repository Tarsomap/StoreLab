/**
 * Formata número em reais para mostrar na interface (sempre com estilo brasileiro).
 * Garante o prefixo `R$ ` com espaço após o símbolo, alinhado ao guia do projeto para valores monetários.
 *
 * @param value - Valor numérico em reais.
 * @param maximumFractionDigits - Quantas casas decimais mostrar (padrão 0 para valores inteiros comuns).
 */
export function formatBrl(value: number, maximumFractionDigits = 0): string {
  const raw = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits,
  }).format(value);
  if (raw.startsWith('R$') && raw.length > 2 && raw[2] !== ' ') {
    return `R$ ${raw.slice(2).trimStart()}`;
  }
  return raw;
}
