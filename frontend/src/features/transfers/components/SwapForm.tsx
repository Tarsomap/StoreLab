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
import type { StoreMember } from '../types';

/**
 * Membro enriquecido com a loja a que pertence — necessário porque o swap escolhe jogadores,
 * não lojas, e precisa exibir/filtrar por loja de origem.
 */
export interface SwapMemberOption extends StoreMember {
  storeId: string;
  storeName: string;
}

interface SwapFormProps {
  candidatesA: SwapMemberOption[];
  candidatesB: SwapMemberOption[];
  userAId: string;
  userBId: string;
  selectedA: SwapMemberOption | null;
  canTransfer: boolean;
  submitting: boolean;
  actionError: string | null;
  onUserAChange: (value: string) => void;
  onUserBChange: (value: string) => void;
  onSwap: () => void;
}

function optionLabel(member: SwapMemberOption): string {
  return `${member.name} · ${ROLE_LABELS[member.role]} · ${member.storeName}`;
}

/**
 * Troca recíproca entre duas lojas cheias: o facilitador escolhe dois jogadores de mesmo papel,
 * em lojas diferentes, e o backend os move ao mesmo tempo. Selecionar jogadores (em vez de loja-destino)
 * é o que contorna o impasse em que a loja recíproca ficaria escondida na transferência unidirecional.
 */
export function SwapForm({
  candidatesA,
  candidatesB,
  userAId,
  userBId,
  selectedA,
  canTransfer,
  submitting,
  actionError,
  onUserAChange,
  onUserBChange,
  onSwap,
}: SwapFormProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">Troca Recíproca</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Para duas lojas cheias: troca dois jogadores de mesmo papel ao mesmo tempo. Conta como 1 saída para cada loja.
        </p>

        {!canTransfer && (
          <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
            Trocas só podem ser feitas no status RECONFIGURATION.
          </p>
        )}

        {actionError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
            {actionError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Jogador 1</Label>
            <Select
              value={userAId}
              onValueChange={onUserAChange}
              disabled={!canTransfer || submitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {candidatesA.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {optionLabel(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Jogador 2 (mesmo papel, outra loja)</Label>
            <Select
              value={userBId}
              onValueChange={onUserBChange}
              disabled={!canTransfer || submitting || !selectedA}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={selectedA ? 'Selecione' : 'Escolha o Jogador 1 primeiro'}
                />
              </SelectTrigger>
              <SelectContent>
                {candidatesB.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {optionLabel(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedA && candidatesB.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum jogador de {ROLE_LABELS[selectedA.role]} disponível em outra loja para trocar.
          </p>
        )}

        <Separator />
        <Button onClick={onSwap} disabled={!canTransfer || submitting || !userAId || !userBId}>
          {submitting ? 'Trocando...' : 'Confirmar Troca'}
        </Button>
      </CardContent>
    </Card>
  );
}
