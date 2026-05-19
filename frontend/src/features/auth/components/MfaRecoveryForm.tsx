'use client';

import { useState, FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldAlert } from 'lucide-react';

interface MfaRecoveryFormProps {
  /** E-mail pré-preenchido vindo da tela de login, se disponível. */
  email?: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

export function MfaRecoveryForm({ email: initialEmail = '', onSuccess, onBack }: MfaRecoveryFormProps) {
  const { disableMfaRecovery } = useAuthStore();

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await disableMfaRecovery(email, password);
      toast.success('2FA desativado. Bem-vindo de volta!');
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Credenciais inválidas';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm auth-stagger">
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

        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="h-5 w-5 text-warning" />
          <h2 className="font-display font-bold text-2xl text-foreground leading-tight">
            Recuperar acesso
          </h2>
        </div>
        <p className="text-muted-foreground text-sm mt-1.5 font-body">
          Confirme suas credenciais para desativar o 2FA e entrar normalmente.
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
          <Label htmlFor="recovery-email" className="text-sm text-muted-foreground">
            E-mail
          </Label>
          <Input
            id="recovery-email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-11 rounded-xl focus-visible:ring-accent focus-visible:border-accent"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recovery-password" className="text-sm text-muted-foreground">
            Senha
          </Label>
          <Input
            id="recovery-password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-11 rounded-xl focus-visible:ring-accent focus-visible:border-accent"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full h-11 font-semibold rounded-xl text-sm"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Desativar 2FA e entrar
        </Button>
      </form>

      {onBack && (
        <button
          onClick={onBack}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground underline"
        >
          Voltar
        </button>
      )}
    </div>
  );
}
