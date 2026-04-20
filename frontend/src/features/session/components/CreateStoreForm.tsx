import { useState, FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface CreateStoreFormProps {
  sessionId: string;
  onCreated: () => Promise<void>;
  onCancel: () => void;
}

/** Formulário inline de criação de nova loja dentro de uma sessão. */
export function CreateStoreForm({ sessionId, onCreated, onCancel }: CreateStoreFormProps) {
  const [newStoreName, setNewStoreName] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);
  const [createStoreError, setCreateStoreError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCreateStoreError('');
    setCreatingStore(true);
    try {
      await api.post('/stores', { sessionId, name: newStoreName.trim() });
      setNewStoreName('');
      await onCreated();
    } catch (err) {
      setCreateStoreError(err instanceof ApiError ? err.message : 'Erro ao criar loja');
    } finally {
      setCreatingStore(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-4 space-y-4">
          {createStoreError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              {createStoreError}
            </p>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="store-name">Nome da loja</Label>
              <Input
                id="store-name"
                placeholder="Ex: Loja Bretas"
                required
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={creatingStore}>
              {creatingStore ? 'Criando...' : 'Criar'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
