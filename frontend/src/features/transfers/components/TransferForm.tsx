import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ROLE_LABELS } from '../lib/transfer-helpers';
import type { StoreMember, StoreStatus } from '../types';

interface TransferFormProps {
  stores: StoreStatus[];
  sourceStoreId: string;
  userId: string;
  targetStoreId: string;
  transferableMembers: StoreMember[];
  availableTargets: StoreStatus[];
  canTransfer: boolean;
  submitting: boolean;
  actionError: string | null;
  onSourceChange: (value: string) => void;
  onUserChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onTransfer: () => void;
}

export function TransferForm({
  stores,
  sourceStoreId,
  userId,
  targetStoreId,
  transferableMembers,
  availableTargets,
  canTransfer,
  submitting,
  actionError,
  onSourceChange,
  onUserChange,
  onTargetChange,
  onTransfer,
}: TransferFormProps) {
  const sourceStore = stores.find((s) => s.storeId === sourceStoreId) ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">Nova Transferência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canTransfer && (
          <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
            Transferências só podem ser feitas no status RECONFIGURATION.
          </p>
        )}

        {actionError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
            {actionError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Loja de origem</Label>
            <Select
              value={sourceStoreId}
              onValueChange={onSourceChange}
              disabled={!canTransfer || submitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.storeId} value={store.storeId}>
                    {store.storeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Jogador</Label>
            <Select
              value={userId}
              onValueChange={onUserChange}
              disabled={!canTransfer || submitting || !sourceStore}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {transferableMembers.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name} ({ROLE_LABELS[member.role]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Loja de destino</Label>
            <Select
              value={targetStoreId}
              onValueChange={onTargetChange}
              disabled={!canTransfer || submitting || !userId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((store) => (
                  <SelectItem key={store.storeId} value={store.storeId}>
                    {store.storeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />
        <Button onClick={onTransfer} disabled={!canTransfer || submitting}>
          {submitting ? 'Transferindo...' : 'Confirmar Transferência'}
        </Button>
      </CardContent>
    </Card>
  );
}
