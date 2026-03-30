'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Navegação de volta ao fluxo de entrada (código + papel) — visão jogador nas rotas /store/... */
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
