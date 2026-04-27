'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface FacilitatorResultsBackNavProps {
  sessionId: string;
}

export function FacilitatorResultsBackNav({ sessionId }: FacilitatorResultsBackNavProps) {
  const router = useRouter();
  return (
    <div className="-mt-1 mb-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(`/dashboard/session/${sessionId}`)}
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        Voltar para a Sessão
      </Button>
    </div>
  );
}
