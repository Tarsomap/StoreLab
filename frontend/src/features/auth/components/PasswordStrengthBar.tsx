import { cn } from '@/lib/utils';
import { STRENGTH_COLORS, STRENGTH_TEXT } from '../lib/password';

interface PasswordStrengthBarProps {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
}

/** Barra visual de força de senha com 4 segmentos coloridos. */
export function PasswordStrengthBar({ level, label }: PasswordStrengthBarProps) {
  if (level === 0) return null;
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              level >= n ? STRENGTH_COLORS[level] : 'bg-muted-foreground/20',
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs font-body', STRENGTH_TEXT[level] ?? 'text-muted-foreground')}>
        Senha {label}
      </p>
    </div>
  );
}
