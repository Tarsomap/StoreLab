'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
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
import { Plus } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  name: string;
  status: string;
  totalDemand: number;
  initialCash: number;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  SETUP: 'Configuração',
  ROUND_1_CONFIG: 'Config. Rodada 1',
  ROUND_1: 'Rodada 1',
  RECONFIGURATION: 'Reconfiguração',
  ROUND_2: 'Rodada 2',
  ROUND_3: 'Rodada 3',
  FINISHED: 'Finalizada',
};

const STATUS_COLOR: Record<string, string> = {
  SETUP: 'bg-muted text-muted-foreground',
  ROUND_1_CONFIG: 'bg-warning/10 text-warning',
  ROUND_1: 'bg-accent/10 text-accent',
  RECONFIGURATION: 'bg-warning/10 text-warning',
  ROUND_2: 'bg-accent/10 text-accent',
  ROUND_3: 'bg-accent/10 text-accent',
  FINISHED: 'bg-primary/10 text-primary',
};

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

  // Create form state
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Minhas Sessões</h2>
            <p className="text-muted-foreground text-sm mt-1">
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

        {/* Create form */}
        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nova sessão</CardTitle>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <CardContent className="space-y-4">
                {createError && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                    {createError}
                  </p>
                )}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1 space-y-2">
                    <Label htmlFor="new-name">Nome da sessão</Label>
                    <Input
                      id="new-name"
                      placeholder="Ex: Turma A"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-demand">Demanda total</Label>
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
                    <Label htmlFor="new-cash">Caixa inicial (R$)</Label>
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

        {/* Sessions list */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            Carregando sessões...
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">Nenhuma sessão criada ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em &quot;+ Nova sessão&quot; para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <Card
                key={s.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/session/${s.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-display font-semibold text-lg leading-tight">
                      {s.name}
                    </CardTitle>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${STATUS_COLOR[s.status] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <CardDescription className="flex items-center justify-between mt-1">
                    <span>{new Date(s.createdAt).toLocaleDateString('pt-BR')}</span>
                    <span className="text-xs font-medium">
                      {STATUS_PROGRESS[s.status] ?? s.status}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1 pt-0">
                  <p>
                    Demanda:{' '}
                    <span className="font-mono font-medium text-foreground">
                      {s.totalDemand.toLocaleString('pt-BR')}
                    </span>
                  </p>
                  <p>
                    Caixa:{' '}
                    <span className="font-mono font-medium text-foreground">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      }).format(s.initialCash)}
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
