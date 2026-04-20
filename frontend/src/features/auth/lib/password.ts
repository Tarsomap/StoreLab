export function getPasswordStrength(pwd: string): { level: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pwd) return { level: 0, label: '' };
  if (pwd.length < 6) return { level: 1, label: 'Fraca' };
  if (pwd.length < 8) return { level: 2, label: 'Média' };
  const extras = [/[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((rx) => rx.test(pwd)).length;
  if (extras >= 2) return { level: 4, label: 'Forte' };
  return { level: 3, label: 'Boa' };
}

export const STRENGTH_COLORS: Record<number, string> = {
  1: 'bg-destructive',
  2: 'bg-warning',
  3: 'bg-warning/80',
  4: 'bg-accent',
};

export const STRENGTH_TEXT: Record<number, string> = {
  1: 'text-destructive',
  2: 'text-warning',
  3: 'text-warning',
  4: 'text-accent',
};
