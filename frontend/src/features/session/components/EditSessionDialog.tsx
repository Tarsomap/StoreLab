'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Timer } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateSession } from '../hooks/use-update-session';
import {
  canEditFullSession,
  RESTRICTED_FIELD_TOOLTIP,
} from '../lib/session-permissions';
import type { Session } from '../types';

interface EditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Pick<Session, 'id' | 'name' | 'status' | 'totalDemand' | 'initialCash' | 'timerEnabled' | 'timerDuration'>;
  onUpdated: (updated: Session) => void;
}

export function EditSessionDialog({
  open,
  onOpenChange,
  session,
  onUpdated,
}: EditSessionDialogProps) {
  const { mutate, isLoading } = useUpdateSession(session.id);
  const fullEdit = canEditFullSession(session.status);

  const [name, setName] = useState(session.name);
  const [totalDemand, setTotalDemand] = useState(String(session.totalDemand));
  const [initialCash, setInitialCash] = useState(String(session.initialCash));
  const [timerEnabled, setTimerEnabled] = useState(session.timerEnabled ?? false);
  const [timerMinutes, setTimerMinutes] = useState(
    session.timerDuration != null ? String(Math.round(session.timerDuration / 60)) : '15',
  );

  const origTimerEnabled = session.timerEnabled ?? false;
  const origTimerMinutes =
    session.timerDuration != null ? String(Math.round(session.timerDuration / 60)) : '15';

  const hasChanges =
    name !== session.name ||
    (fullEdit && totalDemand !== String(session.totalDemand)) ||
    (fullEdit && initialCash !== String(session.initialCash)) ||
    (fullEdit && timerEnabled !== origTimerEnabled) ||
    (fullEdit && timerEnabled && timerMinutes !== origTimerMinutes);

  async function handleSave() {
    try {
      const input: { name?: string; totalDemand?: number; initialCash?: number; timerEnabled?: boolean; timerDuration?: number | null } = {};
      if (name !== session.name) input.name = name;
      if (fullEdit && totalDemand !== String(session.totalDemand)) {
        input.totalDemand = Number(totalDemand);
      }
      if (fullEdit && initialCash !== String(session.initialCash)) {
        input.initialCash = Number(initialCash);
      }
      if (fullEdit && (timerEnabled !== origTimerEnabled || (timerEnabled && timerMinutes !== origTimerMinutes))) {
        input.timerEnabled = timerEnabled;
        input.timerDuration = timerEnabled && timerMinutes ? Number(timerMinutes) * 60 : null;
      }
      const updated = await mutate(input);
      toast.success('Sessão atualizada');
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar sessão';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Editar sessão</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-sm text-muted-foreground">
              Nome
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da sessão"
            />
          </div>

          <TooltipProvider>
            <div className="space-y-1.5">
              <Label htmlFor="edit-demand" className="text-sm text-muted-foreground">
                Demanda total
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block" tabIndex={fullEdit ? -1 : 0}>
                    <Input
                      id="edit-demand"
                      type="number"
                      value={totalDemand}
                      onChange={(e) => setTotalDemand(e.target.value)}
                      disabled={!fullEdit}
                      className="disabled:bg-muted/50 disabled:cursor-default"
                    />
                  </span>
                </TooltipTrigger>
                {!fullEdit && (
                  <TooltipContent side="top" className="max-w-xs">
                    {RESTRICTED_FIELD_TOOLTIP}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-cash" className="text-sm text-muted-foreground">
                Caixa inicial (R$)
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block" tabIndex={fullEdit ? -1 : 0}>
                    <Input
                      id="edit-cash"
                      type="number"
                      value={initialCash}
                      onChange={(e) => setInitialCash(e.target.value)}
                      disabled={!fullEdit}
                      className="disabled:bg-muted/50 disabled:cursor-default"
                    />
                  </span>
                </TooltipTrigger>
                {!fullEdit && (
                  <TooltipContent side="top" className="max-w-xs">
                    {RESTRICTED_FIELD_TOOLTIP}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </TooltipProvider>

          <Separator />

          <div className="space-y-3">
            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={fullEdit ? -1 : 0} className="block">
                  <label className={`flex items-center gap-2 ${fullEdit ? 'cursor-pointer' : 'cursor-default opacity-50'}`}>
                    <input
                      type="checkbox"
                      checked={timerEnabled}
                      onChange={(e) => setTimerEnabled(e.target.checked)}
                      disabled={!fullEdit}
                      className="h-4 w-4 rounded border"
                    />
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Timer className="h-3.5 w-3.5" />
                      Ativar timer por rodada
                    </span>
                  </label>
                </span>
              </TooltipTrigger>
              {!fullEdit && (
                <TooltipContent side="top" className="max-w-xs">
                  {RESTRICTED_FIELD_TOOLTIP}
                </TooltipContent>
              )}
            </Tooltip>
            </TooltipProvider>
            {timerEnabled && fullEdit && (
              <div className="ml-6 space-y-1.5">
                <Label htmlFor="edit-timer-minutes" className="text-sm text-muted-foreground">
                  Duração por rodada (minutos)
                </Label>
                <Input
                  id="edit-timer-minutes"
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
