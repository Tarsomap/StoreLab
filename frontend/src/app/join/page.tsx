'use client';

import { useState, useEffect, useRef, FormEvent, ClipboardEvent, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type StoreRole =
  | 'STORE_MANAGER'
  | 'SUPPLY_MANAGER'
  | 'COMMERCIAL_MANAGER'
  | 'OPERATIONAL_MANAGER'
  | 'SERVICE_MANAGER';

const ROLE_LABELS: Record<StoreRole, string> = {
  STORE_MANAGER: 'Gerente da Loja',
  SUPPLY_MANAGER: 'Gerente de Abastecimento',
  COMMERCIAL_MANAGER: 'Gerente Comercial',
  OPERATIONAL_MANAGER: 'Gerente Operacional',
  SERVICE_MANAGER: 'Gerente de Serviços',
};

interface JoinResponse {
  id: string;
  name: string;
  sessionId: string;
}

interface UserStoreEntry {
  storeId: string;
  storeName: string;
  sessionId: string;
  role: StoreRole;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JoinPage() {
  const router = useRouter();

  // Existing memberships
  const [myStores, setMyStores] = useState<UserStoreEntry[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);

  // OTP code input
  const [chars, setChars] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const accessCode = chars.join('');

  const [role, setRole] = useState<StoreRole>('SUPPLY_MANAGER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState<JoinResponse | null>(null);

  useEffect(() => {
    api
      .get<UserStoreEntry[]>('/stores/mine')
      .then(setMyStores)
      .catch(() => setMyStores([]))
      .finally(() => setLoadingMine(false));
  }, []);

  // Auto-redirect after joining
  useEffect(() => {
    if (joined) {
      const t = setTimeout(() => router.push(`/store/${joined.id}/plan`), 2000);
      return () => clearTimeout(t);
    }
  }, [joined, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const store = await api.post<JoinResponse>('/stores/join', {
        accessCode: accessCode.toUpperCase().trim(),
        role,
      });
      setJoined(store);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao entrar na loja');
    } finally {
      setLoading(false);
    }
  }

  function handleCharChange(idx: number, value: string) {
    const char = value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const next = [...chars];
    next[idx] = char;
    setChars(next);
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleCharKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((c, i) => {
      next[i] = c;
    });
    setChars(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  const codeComplete = accessCode.length === 6;

  // ── Post-join success screen ──────────────────────────────────────────────

  if (joined) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-10 h-10 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h2 className="font-display font-bold text-2xl text-foreground">Você entrou!</h2>
          <p className="text-muted-foreground mt-2 font-body">
            Bem-vindo(a) à{' '}
            <span className="font-semibold text-foreground">{joined.name}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1 font-body">
            Papel:{' '}
            <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span>
          </p>
        </div>

        <p className="text-xs text-muted-foreground animate-pulse font-body">
          Redirecionando para o Plano Operacional...
        </p>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button
            className="w-full rounded-xl"
            onClick={() => router.push(`/store/${joined.id}/plan`)}
          >
            Ir para o PO agora
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => {
              setJoined(null);
              setChars(['', '', '', '', '', '']);
            }}
          >
            Entrar em outra loja
          </Button>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto py-4 space-y-8">
      {/* Page heading */}
      <div className="text-center space-y-1">
        <h1 className="font-display font-bold text-2xl text-foreground">Entre na Partida</h1>
        <p className="text-muted-foreground text-sm font-body">
          Insira o código de 6 caracteres fornecido pelo facilitador
        </p>
      </div>

      {/* Existing memberships */}
      {!loadingMine && myStores.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wider font-body">
            Suas lojas atuais
          </p>
          {myStores.map((s) => (
            <div
              key={s.storeId}
              className="bg-card rounded-xl border border-primary/20 px-4 py-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
            >
              <div>
                <p className="font-semibold text-sm text-foreground font-body">{s.storeName}</p>
                <p className="text-xs text-muted-foreground font-body">{ROLE_LABELS[s.role]}</p>
              </div>
              <Button
                size="sm"
                className="rounded-lg shrink-0"
                onClick={() => router.push(`/store/${s.storeId}/plan`)}
              >
                Ir para o PO
              </Button>
            </div>
          ))}
          <p className="text-xs text-center text-muted-foreground pt-1 font-body">
            Ou entre em uma nova loja abaixo
          </p>
        </div>
      )}

      {/* Join form */}
      <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* OTP Code Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground block text-center">
              Código de acesso
            </Label>
            <div className="flex gap-2 justify-center">
              {chars.map((char, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="text"
                  maxLength={2}
                  value={char}
                  onChange={(e) => handleCharChange(idx, e.target.value)}
                  onKeyDown={(e) => handleCharKeyDown(idx, e)}
                  onPaste={idx === 0 ? handlePaste : undefined}
                  className={cn(
                    'w-11 h-14 text-center text-xl font-mono font-bold uppercase rounded-xl border-2 bg-background outline-none select-none',
                    'transition-all duration-150',
                    char
                      ? 'border-accent text-foreground'
                      : 'border-border text-foreground',
                    'focus:border-primary focus:ring-0',
                  )}
                  style={char ? { boxShadow: '0 0 0 3px hsl(142 71% 45% / 0.15)' } : undefined}
                />
              ))}
            </div>
            {codeComplete && (
              <p className="text-xs text-accent text-center font-body flex items-center justify-center gap-1">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                </svg>
                Código completo
              </p>
            )}
          </div>

          {/* Role selector */}
          <div className="space-y-1.5">
            <Label htmlFor="store-role" className="text-sm font-medium text-foreground">
              Seu papel na loja
            </Label>
            <div className="relative">
              <select
                id="store-role"
                value={role}
                onChange={(e) => setRole(e.target.value as StoreRole)}
                className="w-full h-11 appearance-none rounded-xl border border-input bg-background px-4 pr-10 text-sm font-body cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {(Object.entries(ROLE_LABELS) as [StoreRole, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg
                  viewBox="0 0 16 16"
                  className="w-4 h-4 text-muted-foreground"
                  fill="currentColor"
                >
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
