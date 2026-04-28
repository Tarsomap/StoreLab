import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionStatusBadge } from './SessionStatusBadge';
import { TransferList } from './TransferList';
import type { TransferSessionSummary } from '../types';

interface TransferSummaryCardProps {
  summary: TransferSessionSummary;
}

export function TransferSummaryCard({ summary }: TransferSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">Status da Regra</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <SessionStatusBadge canAdvance={summary.canAdvanceToRound2} />
        </div>
        <TransferList stores={summary.stores} />
      </CardContent>
    </Card>
  );
}
