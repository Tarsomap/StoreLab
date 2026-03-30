/**
 * Formata valor em BRL com font-mono nos consumidores.
 * Garante prefixo "R$ " (com espaço) para consistência visual.
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
