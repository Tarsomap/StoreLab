'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

export default function JoinPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [accessCode, setAccessCode] = useState('');
  const [role, setRole] = useState<StoreRole>('SUPPLY_MANAGER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState<JoinResponse | null>(null);

  function handleLogout() {
    logout();
    router.push('/login');
  }

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
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erro ao entrar na loja');
      }
    } finally {
      setLoading(false);
    }
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-green-600">Você entrou!</CardTitle>
            <CardDescription>
              Bem-vindo(a) à loja <strong>{joined.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Papel: <strong>{ROLE_LABELS[role]}</strong></p>
            <p>Aguarde o facilitador iniciar a sessão.</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setJoined(null);
                setAccessCode('');
              }}
            >
              Entrar em outra loja
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Retail Game Platform</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.name}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Entrar na Loja</CardTitle>
            <CardDescription>
              Insira o código de acesso fornecido pelo facilitador
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="code">Código de acesso</Label>
                <Input
                  id="code"
                  placeholder="Ex: AB12CD"
                  maxLength={6}
                  required
                  value={accessCode}
                  onChange={(e) =>
                    setAccessCode(e.target.value.toUpperCase())
                  }
                  className="tracking-widest text-center font-mono text-lg uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-role">Seu papel na loja</Label>
                <select
                  id="store-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as StoreRole)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {(Object.entries(ROLE_LABELS) as [StoreRole, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar na loja'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
