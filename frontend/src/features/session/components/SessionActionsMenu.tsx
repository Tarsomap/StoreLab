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
import { canDeleteSession, DELETE_BLOCKED_TOOLTIP } from '../lib/session-permissions';
import { DeleteSessionDialog } from './DeleteSessionDialog';
import { EditSessionDialog } from './EditSessionDialog';
import type { Session } from '../types';

interface SessionActionsMenuProps {
  session: Pick<Session, 'id' | 'name' | 'status' | 'totalDemand' | 'initialCash'>;
  onDeleted: () => void;
  onUpdated: (updated: Session) => void;
  align?: 'start' | 'end';
}

export function SessionActionsMenu({
  session,
  onDeleted,
  onUpdated,
  align = 'end',
}: SessionActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canDelete = canDeleteSession(session.status);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Ações da sessão">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-40">
          <DropdownMenuItem
            onSelect={() => setEditOpen(true)}
            className="cursor-pointer"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => canDelete && setDeleteOpen(true)}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
            {!canDelete && (
              <span
                className="ml-auto max-w-[80px] text-[10px] leading-tight text-muted-foreground"
                title={DELETE_BLOCKED_TOOLTIP}
              >
                SETUP / FINISHED
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditSessionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        session={session}
        onUpdated={onUpdated}
      />

      <DeleteSessionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        session={{ id: session.id, name: session.name }}
        onDeleted={onDeleted}
      />
    </>
  );
}
