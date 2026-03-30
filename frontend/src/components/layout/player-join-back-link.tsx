'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Botão “Voltar para Entrar na Sessão” no topo das rotas `/store/...` — leva de volta ao `/join` para trocar de loja ou código.
 */
export function PlayerJoinBackLink() {
  const router = useRouter();

  return (
    <div className="mb-6 -mt-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => router.push('/join')}
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        Voltar para Entrar na Sessão
      </Button>
    </div>
  );
}
