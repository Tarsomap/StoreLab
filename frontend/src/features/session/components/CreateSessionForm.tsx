import { useState, FormEvent } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Timer } from 'lucide-react';
import type { Session, CategoryCatalogEntry } from '../types';

interface CreateSessionFormProps {
  categoryCatalog: CategoryCatalogEntry[];
  categoryStocks: Record<string, string>;
  onStockChange: (id: string, value: string) => void;
  onCreated: (session: Session) => void;
  onCancel: () => void;
}

/** Formulário inline de criação de nova sessão. */
export function CreateSessionForm({
  categoryCatalog,
  categoryStocks,
  onStockChange,
  onCreated,
  onCancel,
}: CreateSessionFormProps) {
  const [newName, setNewName] = useState('');
  const [newDemand, setNewDemand] = useState('1000');
  const [newCash, setNewCash] = useState('700000');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState('15');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const session = await api.post<Session>('/sessions', {
        name: newName.trim(),
        totalDemand: Number(newDemand),
        initialCash: Number(newCash),
        categoryConfigs: categoryCatalog.map((category) => ({
          categoryId: category.id,
          stockAvailable: Number(categoryStocks[category.id] ?? category.stockAvailable),
        })),
        ...(timerEnabled && timerMinutes
          ? { timerEnabled: true, timerDuration: Number(timerMinutes) * 60 }
          : {}),
      });
      toast.success('Sessão criada');
      onCreated(session);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar sessão');
    } finally {
      setCreating(false);
    }
  }

  return (
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
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

          {categoryCatalog.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Disponibilidade por categoria</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {categoryCatalog.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <Label htmlFor={`stock-${category.id}`} className="text-sm text-muted-foreground">
                      {category.name}
                    </Label>
                    <Input
                      id={`stock-${category.id}`}
                      type="number"
                      min={0}
                      value={categoryStocks[category.id] ?? ''}
                      onChange={(e) => onStockChange(category.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="timer-enabled"
                type="checkbox"
                checked={timerEnabled}
                onChange={(e) => setTimerEnabled(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border"
              />
              <Label htmlFor="timer-enabled" className="cursor-pointer flex items-center gap-1.5 text-sm text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                Ativar timer por rodada
              </Label>
            </div>
            {timerEnabled && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="timer-minutes" className="text-sm text-muted-foreground">
                  Duração por rodada (minutos)
                </Label>
                <Input
                  id="timer-minutes"
                  type="number"
                  min={1}
                  max={180}
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(e.target.value)}
                  className="max-w-[120px]"
                />
              </div>
            )}
          </div>
        </CardContent>
        <div className="px-6 pb-6 flex gap-3">
          <Button type="submit" disabled={creating} className="sm:w-auto">
            {creating ? 'Criando...' : 'Criar sessão'}
          </Button>
          <Button type="button" variant="outline" className="hover:bg-destructive hover:text-destructive-foreground" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
