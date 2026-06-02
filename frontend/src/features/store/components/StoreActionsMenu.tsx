'use client';

import { useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteStoreDialog } from './DeleteStoreDialog';
import { EditStoreDialog } from './EditStoreDialog';
import type { Store } from '../types';

interface StoreActionsMenuProps {
  store: Pick<Store, 'id' | 'name'>;
  onDeleted: () => void;
  onUpdated: (updated: Store) => void;
  align?: 'start' | 'end';
}

export function StoreActionsMenu({
  store,
  onDeleted,
  onUpdated,
  align = 'end',
}: StoreActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Ações da loja">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditStoreDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        store={store}
        onUpdated={onUpdated}
      />

      <DeleteStoreDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        store={{ id: store.id, name: store.name }}
        onDeleted={onDeleted}
      />
    </>
  );
}
