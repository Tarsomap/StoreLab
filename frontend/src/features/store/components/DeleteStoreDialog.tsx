'use client';

import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteStore } from '../hooks/use-delete-store';

interface DeleteStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: { id: string; name: string };
  onDeleted: () => void;
}

export function DeleteStoreDialog({
  open,
  onOpenChange,
  store,
  onDeleted,
}: DeleteStoreDialogProps) {
  const { mutate, isLoading } = useDeleteStore(store.id);

  async function handleDelete() {
    try {
      await mutate();
      toast.success('Loja excluída');
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir loja';
      toast.error(message);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir loja?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove permanentemente a loja{' '}
            <span className="font-semibold text-foreground">{store.name}</span> e todos os dados
            vinculados: membros, planos operacionais, transferências, resultados e respostas de
            quiz. Não é possível desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Excluindo…' : 'Excluir'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
