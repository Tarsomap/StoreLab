'use client';

/**
 * Fluxo do usuário — Cadastro:
 * 1) Escolhe Jogador ou Facilitador, preenche nome, e-mail e senha (indicador visual de força só orienta).
 * 2) POST `/auth/register` — em sucesso vai para `/join` ou `/dashboard` conforme o papel.
 * 3) Erros da API aparecem no cartão e no toast.
 */
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PasswordStrengthBar } from '@/features/auth/components/PasswordStrengthBar';
import { getPasswordStrength } from '@/features/auth/lib/password';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PLAYER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, role);
      toast.success('Conta criada com sucesso!');
      router.push(role === 'FACILITATOR' ? '/dashboard' : '/join');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const strength = getPasswordStrength(password);

  return (
    <div className="w-full max-w-sm auth-stagger">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-primary-foreground" fill="currentColor">
              <path d="M2 3h12v2H2V3zm1 4h10v6H3V7zm2 1v4h6V8H5z" />
            </svg>
          </div>
          <span className="font-display font-semibold text-sm text-foreground tracking-tight">
            Store<span style={{ color: 'hsl(142 71% 45%)' }}>Lab</span>
          </span>
        </div>
        <h2 className="font-display font-bold text-2xl text-foreground leading-tight">Criar conta</h2>
        <p className="text-muted-foreground text-sm mt-1.5 font-body">Escolha seu perfil e comece agora</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 flex items-start gap-2">
            <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 9.5h-1.5v-1.5h1.5v1.5zm0-3h-1.5v-4h1.5v4z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Tipo de conta</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {(['PLAYER', 'FACILITATOR'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'relative flex flex-col items-start gap-2.5 rounded-xl border-2 p-4 text-left outline-none',
                  'focus-visible:ring-2 focus-visible:ring-accent/50',
                  role === r
                    ? 'border-primary bg-primary/[0.04] shadow-sm'
                    : 'border-border hover:border-primary/35 hover:bg-muted/50',
                )}
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', role === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {r === 'PLAYER' ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 10 12 5 2 10 12 15 22 10" />
                      <path d="M6 12v5c3.5 3.5 8.5 3.5 12 0v-5" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={cn('text-sm font-semibold font-display', role === r ? 'text-foreground' : 'text-muted-foreground')}>
                    {r === 'PLAYER' ? 'Jogador' : 'Facilitador'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-body leading-snug">
                    {r === 'PLAYER' ? 'Participa nas decisões da loja' : 'Gerencia e monitora sessões'}
                  </p>
                </div>
                {role === r && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 5l2 2 4-4" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm text-muted-foreground">Nome</Label>
          <Input id="name" type="text" placeholder="Seu nome completo" autoComplete="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl focus-visible:ring-accent focus-visible:border-accent" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-muted-foreground">E-mail</Label>
          <Input id="email" type="email" placeholder="seu@email.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl focus-visible:ring-accent focus-visible:border-accent" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm text-muted-foreground">Senha</Label>
          <Input id="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl focus-visible:ring-accent focus-visible:border-accent" />
          {password && <PasswordStrengthBar level={strength.level} label={strength.label} />}
        </div>

        <Button type="submit" className="w-full h-11 font-semibold rounded-xl text-sm" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Criando conta...
            </span>
          ) : (
            'Criar conta'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground font-body">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary font-medium hover:text-accent transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
