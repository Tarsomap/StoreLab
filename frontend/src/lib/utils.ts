import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Junta classes CSS condicionais e resolve conflitos do Tailwind (a última classe “ganha”).
 * Usamos em componentes shadcn para mesclar estilos padrão com `className` vindo de fora.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
