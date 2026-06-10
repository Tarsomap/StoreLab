'use client';

/**
 * Fluxo do jogador — Entrar na partida (`/join`):
 * 1) Vê lojas em que já está (GET `/stores/mine`) com atalho para o PO.
 * 2) Digita código de 6 caracteres + papel → POST `/stores/join`; sucesso mostra confirmação e redireciona ao PO em ~2s.
 * 3) Pode colar código inteiro no primeiro campo; navegação entre caixas com teclado.
 */
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useJoinSession } from '@/features/auth/hooks/use-join-session';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { JoinSuccessScreen } from '@/features/auth/components/JoinSuccessScreen';
import { MyStoresList } from '@/features/auth/components/MyStoresList';
import type { StoreRole } from '@/features/auth/types';
import { ROLE_LABELS } from '@/features/auth/types';

export default function JoinPage() {
  const router = useRouter();
  const { myStores, loadingMine, joined, loading, error, join, reset, clearError } = useJoinSession();

  const [chars, setChars] = useState<string[]>(['', '', '', '', '', '']);
  const [role, setRole] = useState<StoreRole>('SUPPLY_MANAGER');

  const accessCode = chars.join('');
  const codeComplete = accessCode.length === 6;

  useEffect(() => {
    if (joined) {
      const t = setTimeout(() => router.push(`/store/${joined.id}/plan`), 2000);
      return () => clearTimeout(t);
    }
  }, [joined, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await join(accessCode, role);
  }

  if (joined) {
    return (
      <JoinSuccessScreen
        joined={joined}
        role={role}
        onGoToPlan={() => router.push(`/store/${joined.id}/plan`)}
        onJoinAnother={() => {
          reset();
          setChars(['', '', '', '', '', '']);
        }}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto py-4 space-y-7">
      <div className="text-center space-y-2">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-1"
          style={{
            background: 'linear-gradient(135deg, hsl(222 47% 21%), hsl(222 47% 30%))',
            boxShadow: '0 4px 16px hsl(222 47% 21% / 0.25)',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground">Entre na Partida</h1>
        <p className="text-muted-foreground text-sm font-body">
          Insira o código de 6 caracteres fornecido pelo facilitador
        </p>
        <button
          type="button"
          onClick={() => router.push('/tutorial?role=player')}
          className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          Primeira vez? Veja o tutorial
        </button>
      </div>

      {!loadingMine && (
        <MyStoresList
          stores={myStores}
          onNavigateToPlan={(storeId) => router.push(`/store/${storeId}/plan`)}
        />
      )}

      <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 9.5h-1.5v-1.5h1.5v1.5zm0-3h-1.5v-4h1.5v4z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground block text-center">
              Código de acesso
            </Label>
            <OtpInput
              chars={chars}
              onChange={(newChars) => {
                if (error) clearError();
                setChars(newChars);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="store-role" className="text-sm font-medium text-foreground">
              Seu papel na loja
            </Label>
            <div className="relative">
              <select
                id="store-role"
                value={role}
                onChange={(e) => setRole(e.target.value as StoreRole)}
                className="w-full h-11 appearance-none rounded-xl border-2 border-border bg-background px-4 pr-10 text-sm font-body cursor-pointer focus:outline-none focus:border-primary focus:ring-0 hover:border-primary/35"
              >
                {(Object.entries(ROLE_LABELS) as [StoreRole, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg viewBox="0 0 16 16" className="w-4 h-4 text-muted-foreground" fill="currentColor">
                  <path d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" />
                </svg>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-semibold rounded-xl text-sm"
            disabled={loading || !codeComplete}
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
              'Entrar na loja'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
