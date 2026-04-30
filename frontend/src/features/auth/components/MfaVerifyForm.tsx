'use client';

/**
 * Formulário para verificar código TOTP durante login.
 * Exibido quando o servidor retorna { mfaRequired: true, userId } após validar e-mail/senha.
 */
import { useState, FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface MfaVerifyFormProps {
  userId: string;
  onSuccess?: () => void;
}

export function MfaVerifyForm({ userId, onSuccess }: MfaVerifyFormProps) {
  const { verify2fa } = useAuthStore();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verify2fa(userId, code);
      toast.success('Código validado! Bem-vindo de volta!');
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Código inválido ou expirado';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm auth-stagger">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg
              viewBox="0 0 16 16"
              className="w-4 h-4 text-primary-foreground"
              fill="currentColor"
            >
              <path d="M2 3h12v2H2V3zm1 4h10v6H3V7zm2 1v4h6V8H5z" />
            </svg>
          </div>
          <span className="font-display font-semibold text-sm text-foreground tracking-tight">
            Store<span style={{ color: 'hsl(142 71% 45%)' }}>Lab</span>
          </span>
        </div>

        <h2 className="font-display font-bold text-2xl text-foreground leading-tight">
          Verificar autenticação
        </h2>
        <p className="text-muted-foreground text-sm mt-1.5 font-body">
          Digite o código do seu app de autenticação
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 flex items-start gap-2">
            <svg
              viewBox="0 0 16 16"
              className="w-4 h-4 shrink-0 mt-0.5"
              fill="currentColor"
            >
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 9.5h-1.5v-1.5h1.5v1.5zm0-3h-1.5v-4h1.5v4z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="mfa-code" className="text-sm text-muted-foreground">
            Código de 6 dígitos
          </Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            disabled={loading}
            className="text-center font-mono tracking-widest text-lg"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Abra seu app de autenticação (Google Authenticator, Authy, etc.) e digite o código de 6 dígitos
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verificar
        </Button>
      </form>
    </div>
  );
}
