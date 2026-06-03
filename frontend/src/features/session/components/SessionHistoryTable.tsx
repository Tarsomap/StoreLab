import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History } from 'lucide-react';
import type { Session } from '../types';
import { formatSessionWinner, formatStoreCount } from '../lib/session-phases';
import { SessionActionsMenu } from './SessionActionsMenu';

interface SessionHistoryTableProps {
  finishedSessions: Session[];
  onDeleted: (id: string) => void;
  onUpdated: (updated: Session) => void;
}

/** Tabela de sessões finalizadas no dashboard do facilitador. */
export function SessionHistoryTable({
  finishedSessions,
  onDeleted,
  onUpdated,
}: SessionHistoryTableProps) {
  const router = useRouter();

  if (finishedSessions.length === 0) {
    return (
      <Card className="shadow-sm border rounded-xl transition-colors duration-200">
        <CardContent className="py-14 px-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <History className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">Nenhuma sessão finalizada ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border rounded-xl transition-colors duration-200">
      <CardContent className="p-0">
        <div className="divide-y sm:hidden">
          {finishedSessions.map((s) => (
            <div key={s.id} className="space-y-4 p-4">
              <div className="space-y-1">
                <p className="font-display text-base font-semibold text-foreground">{s.name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Lojas
                  </p>
                  <p className="mt-1 font-mono text-foreground">{formatStoreCount(s)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Vencedor
                  </p>
                  <p className="mt-1 text-foreground">{formatSessionWinner(s)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 rounded-xl"
                  onClick={() => router.push(`/session/${s.id}/results`)}
                >
                  Ver resultados
                </Button>
                <div onClick={(e) => e.stopPropagation()}>
                  <SessionActionsMenu
                    session={s}
                    onDeleted={() => onDeleted(s.id)}
                    onUpdated={onUpdated}
                    align="end"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-display text-foreground">Nome da sessão</TableHead>
                <TableHead className="font-display text-foreground">Data</TableHead>
                <TableHead className="font-display text-foreground text-right">Nº de lojas</TableHead>
                <TableHead className="font-display text-foreground">Vencedor</TableHead>
                <TableHead className="font-display text-foreground text-right w-[200px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finishedSessions.map((s) => (
                <TableRow key={s.id} className="hover:bg-transparent">
                  <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    {formatStoreCount(s)}
                  </TableCell>
                  <TableCell className="text-foreground">{formatSessionWinner(s)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="whitespace-nowrap rounded-xl px-4"
                        onClick={() => router.push(`/session/${s.id}/results`)}
                      >
                        Ver resultados
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <SessionActionsMenu
                          session={s}
                          onDeleted={() => onDeleted(s.id)}
                          onUpdated={onUpdated}
                          align="end"
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
