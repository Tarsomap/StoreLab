'use client';

/**
 * Fluxo do usuário — Login com MFA:
 * 1) Digita e-mail e senha → envia POST `/auth/login` via `useAuthStore.login`.
 * 2a) Se MFA desativado: store guarda tokens, redirecionamos.
 * 2b) Se MFA ativado: store devolve { mfaRequired, userId } sem tokens; renderizamos <MfaVerifyForm>.
 * 3) Após validar código no MfaVerifyForm: store guarda tokens, redirecionamos.
 */
import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { MfaVerifyForm } from '@/features/auth/components/MfaVerifyForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Helper de redirect pós-autenticação. Centraliza a regra para evitar
 * divergência entre o caminho normal e o caminho MFA.
 */
function useAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return () => {
    const from = searchParams.get('from');
    const user = useAuthStore.getState().user;
    if (from) {
      router.push(from);
    } else {
      router.push(user?.role === 'FACILITATOR' ? '/dashboard' : '/join');
    }
  };
}

/**
 * Formulário de entrada: campos controlados, loading no botão e tratamento de erro da API.
 * Alterna entre formulário de login e formulário de MFA quando o backend exigir TOTP.
 */
function LoginForm() {
  const { login } = useAuthStore();
  const redirectAfterAuth = useAuthRedirect();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      // Backend exigiu TOTP: trocamos o formulário sem dar toast de boas-vindas ainda.
      if ('mfaRequired' in result) {
        setMfaUserId(result.userId);
        return;
      }

      toast.success('Bem-vindo de volta!');
      redirectAfterAuth();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    setMfaUserId(null);
    setEmail('');
    setPassword('');
    setError('');
  }

  // Caminho MFA: o store já cuidará dos tokens internamente quando o código for validado.
  if (mfaUserId) {
    return (
      <div className="flex flex-col items-center">
        <MfaVerifyForm userId={mfaUserId} email={email} onSuccess={redirectAfterAuth} />
        <button
          onClick={handleBackToLogin}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
        >
          Voltar ao login
        </button>
      </div>
    );
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
          Bem-vindo de volta
        </h2>
        <p className="text-muted-foreground text-sm mt-1.5 font-body">
          Entre com sua conta para continuar
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
          <Label htmlFor="email" className="text-sm text-muted-foreground">
            E-mail
          </Label>
          <Input
            id="email"
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
          <Label htmlFor="password" className="text-sm text-muted-foreground">
            Senha
          </Label>
          <Input
            id="password"
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
          className="w-full h-11 font-semibold rounded-xl text-sm"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Entrando...
            </span>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground font-body">
          Não tem conta?{' '}
          <Link
            href="/register"
            className="text-primary font-medium hover:text-accent transition-colors"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Página `/login` com Suspense porque `useSearchParams` exige boundary no Next.js 14. */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}