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
import { useDeleteSession } from '../hooks/use-delete-session';

interface DeleteSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: { id: string; name: string };
  onDeleted: () => void;
}

export function DeleteSessionDialog({
  open,
  onOpenChange,
  session,
  onDeleted,
}: DeleteSessionDialogProps) {
  const { mutate, isLoading } = useDeleteSession(session.id);

  async function handleDelete() {
    try {
      await mutate();
      toast.success('Sessão excluída');
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir sessão';
      toast.error(message);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove permanentemente a sessão{' '}
            <span className="font-semibold text-foreground">{session.name}</span> e todos os dados
            vinculados: lojas, planos operacionais, quiz, resultados e transferências. Não é
            possível desfazer.
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
