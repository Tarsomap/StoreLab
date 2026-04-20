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

interface SessionHistoryTableProps {
  finishedSessions: Session[];
}

/** Tabela de sessões finalizadas no dashboard do facilitador. */
export function SessionHistoryTable({ finishedSessions }: SessionHistoryTableProps) {
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
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-display text-foreground">Nome da sessão</TableHead>
                <TableHead className="font-display text-foreground">Data</TableHead>
                <TableHead className="font-display text-foreground text-right">Nº de lojas</TableHead>
                <TableHead className="font-display text-foreground">Vencedor</TableHead>
                <TableHead className="font-display text-foreground text-right w-[140px]">Ações</TableHead>
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
                    <Button
                      type="button"
                      size="sm"
                      className="w-full shrink-0 whitespace-nowrap rounded-xl px-4 sm:min-w-[148px] sm:w-auto"
                      onClick={() => router.push(`/session/${s.id}/results`)}
                    >
                      Ver resultados
                    </Button>
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
