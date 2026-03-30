'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatBrl } from '@/lib/format-brl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import {
  SessionStatusBadge,
  SESSION_STATUS_LABEL,
} from '@/components/session-status-badge';

// ── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  name: string;
  status: string;
  totalDemand: number;
  initialCash: number;
  createdAt: string;
}

const STATUS_PROGRESS: Record<string, string> = {
  SETUP: 'Configuração',
  ROUND_1_CONFIG: 'Configuração R.1',
  ROUND_1: 'Rodada 1 de 3',
  RECONFIGURATION: 'Reconfiguração',
  ROUND_2: 'Rodada 2 de 3',
  ROUND_3: 'Rodada 3 de 3',
  FINISHED: 'Finalizada',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDemand, setNewDemand] = useState('1000');
  const [newCash, setNewCash] = useState('700000');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    api
      .get<Session[]>('/sessions')
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const session = await api.post<Session>('/sessions', {
        name: newName.trim(),
        totalDemand: Number(newDemand),
        initialCash: Number(newCash),
      });
      toast.success('Sessão criada');
      setSessions((prev) => [session, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDemand('1000');
      setNewCash('700000');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar sessão');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Minhas Sessões</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as sessões de jogo
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? (
            'Cancelar'
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Nova sessão
            </>
          )}
        </Button>
      </div>

      {showCreate && (
        <Card className="shadow-sm border">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold font-display">Nova sessão</CardTitle>
          </CardHeader>
          <Separator className="my-4" />
          <form onSubmit={handleCreate}>
            <CardContent className="space-y-4 pt-0">
              {createError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                  {createError}
                </p>
              )}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1 space-y-2">
                  <Label htmlFor="new-name" className="text-sm text-muted-foreground">
                    Nome da sessão
                  </Label>
                  <Input
                    id="new-name"
                    placeholder="Ex: Turma A"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-demand" className="text-sm text-muted-foreground">
                    Demanda total
                  </Label>
                  <Input
                    id="new-demand"
                    type="number"
                    min={1}
                    required
                    value={newDemand}
                    onChange={(e) => setNewDemand(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-cash" className="text-sm text-muted-foreground">
                    Caixa inicial (R$)
                  </Label>
                  <Input
                    id="new-cash"
                    type="number"
                    min={1}
                    required
                    value={newCash}
                    onChange={(e) => setNewCash(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <Button type="submit" disabled={creating}>
                {creating ? 'Criando...' : 'Criar sessão'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {sessions.length === 0 ? (
        <Card className="shadow-sm border">
          <CardContent className="py-16 px-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <LayoutDashboard className="h-7 w-7" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-display text-base font-semibold text-foreground">
                Nenhuma sessão criada ainda
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Crie a primeira sessão para convidar lojas e acompanhar as rodadas do jogo.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova sessão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer shadow-sm border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => router.push(`/dashboard/session/${s.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-display font-semibold text-base leading-tight">
                    {s.name}
                  </CardTitle>
                  <SessionStatusBadge status={s.status} />
                </div>
                <CardDescription className="flex items-center justify-between mt-1 text-sm">
                  <span>{new Date(s.createdAt).toLocaleDateString('pt-BR')}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {STATUS_PROGRESS[s.status] ?? SESSION_STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="text-sm text-muted-foreground space-y-1 pt-4">
                <p>
                  Demanda:{' '}
                  <span className="font-mono font-medium text-foreground">
                    {s.totalDemand.toLocaleString('pt-BR')}
                  </span>
                </p>
                <p>
                  Caixa:{' '}
                  <span className="font-mono font-medium text-foreground">
                    {formatBrl(s.initialCash)}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
