'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateStore } from '../hooks/use-update-store';
import type { Store } from '../types';

interface EditStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Pick<Store, 'id' | 'name'>;
  onUpdated: (updated: Store) => void;
}

export function EditStoreDialog({
  open,
  onOpenChange,
  store,
  onUpdated,
}: EditStoreDialogProps) {
  const { mutate, isLoading } = useUpdateStore(store.id);
  const [name, setName] = useState(store.name);

  const hasChanges = name.trim() !== '' && name !== store.name;

  async function handleSave() {
    try {
      const updated = await mutate({ name });
      toast.success('Loja atualizada');
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar loja';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Editar loja</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-store-name" className="text-sm text-muted-foreground">
              Nome
            </Label>
            <Input
              id="edit-store-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da loja"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
            {isLoading ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
