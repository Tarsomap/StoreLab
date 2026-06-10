'use client';

/**
 * Fluxo — Resultados / ranking (`/session/[id]/results`):
 * 1) GET agrega resultados por loja e ranking; enquanto carrega mostra esqueleto.
 * 2) WebSocket na sessão escuta `round:results` e `session:finished` para atualizar placar quando o motor roda ou a partida termina.
 * 3) Pódio visual por colocação, detalhes por rodada e cores de medalha; facilitador e jogador usam a mesma rota autenticada.
 */
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Trophy, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResultsSkeleton } from '@/components/skeletons/results-skeleton';
import { useResults } from '@/features/results/hooks';
import {
  PodiumCard,
  RankingTable,
  StoreBreakdownCard,
  FacilitatorResultsBackNav,
} from '@/features/results/components';
import {
  computePodiumOrder,
  computeStoreRankMap,
  ebitdaClass,
  fmtPct,
} from '@/features/results/lib';

/** Página de ranking final e histórico por loja com atualização em tempo real após cálculos do motor. */
export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { ranking, storeResults, loading, error } = useResults(sessionId);

  function toggleExpanded(storeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(storeId) ? next.delete(storeId) : next.add(storeId);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pb-16">
        {user?.role === 'FACILITATOR' && <FacilitatorResultsBackNav sessionId={sessionId} />}
        <ResultsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        {user?.role === 'FACILITATOR' && <FacilitatorResultsBackNav sessionId={sessionId} />}
        <div className="flex items-center justify-center py-32">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  const storeRankMap = computeStoreRankMap(ranking);
  const sortedStoreResults = [...storeResults].sort(
    (a, b) => (storeRankMap[a.storeId] ?? 99) - (storeRankMap[b.storeId] ?? 99),
  );
  const winner = ranking.find((r) => r.rank === 1);
  const { podiumTop, fourthPlace } = computePodiumOrder(ranking);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 pb-16 sm:px-6 lg:px-0">
      {user?.role === 'FACILITATOR' && <FacilitatorResultsBackNav sessionId={sessionId} />}

      {/* ── HERO HEADER ───────────────────────────────────────────────────── */}
      <div className="space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest">
          <Trophy className="w-3.5 h-3.5" />
          Resultado Final
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Resultado da Sessão
        </h1>
        {winner ? (
          <p className="text-muted-foreground text-base">
            <span className="font-display font-semibold text-foreground">
              {winner.storeName}
            </span>{' '}
            conquistou o 1º lugar com{' '}
            <span className={`font-mono font-bold ${ebitdaClass(winner.avgEbitdaPercentage)}`}>
              {fmtPct(winner.avgEbitdaPercentage)}
            </span>{' '}
            de EBITDA médio.
          </p>
        ) : (
          <p className="text-muted-foreground text-base">
            Aguardando resultados das rodadas.
          </p>
        )}
      </div>

      {/* ── PODIUM ────────────────────────────────────────────────────────── */}
      {ranking.length > 0 && (
        <section>
          {/* 1st, 2nd, 3rd in podium layout */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            {podiumTop.map((entry, idx) => (
              <div
                key={entry.storeId}
                className={
                  idx === 1
                    ? 'order-1 sm:order-2 sm:-translate-y-5'
                    : idx === 0
                      ? 'order-2 sm:order-1'
                      : 'order-3'
                }
              >
                <PodiumCard entry={entry} podiumBaseStrip />
              </div>
            ))}
          </div>

          {/* 4th place below the podium */}
          {fourthPlace && (
            <div className="mx-auto mt-4 max-w-xs sm:mt-5">
              <PodiumCard entry={fourthPlace} />
            </div>
          )}
        </section>
      )}

      {/* ── RANKING TABLE ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-foreground">
          Tabela de Classificação
        </h2>
        {ranking.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum resultado disponível ainda.
            </CardContent>
          </Card>
        ) : (
          <RankingTable ranking={ranking} />
        )}
      </section>

      {/* ── BREAKDOWN ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-foreground">
          Breakdown por Loja
        </h2>
        <div className="space-y-3">
          {sortedStoreResults.map((store) => (
            <StoreBreakdownCard
              key={store.storeId}
              store={store}
              rank={storeRankMap[store.storeId] ?? 4}
              isExpanded={expanded.has(store.storeId)}
              onToggle={() => toggleExpanded(store.storeId)}
            />
          ))}
        </div>
      </section>

      {/* ── EVENTOS POR RODADA ────────────────────────────────────────────── */}
      {ranking.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Eventos por Rodada
          </h2>
          <div className="flex flex-wrap gap-3">
            {Array.from(new Set(sortedStoreResults.flatMap((s) => s.rounds.map((r) => r.round)))).sort((a, b) => a - b).map((round) => (
              <Button
                key={round}
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => router.push(`/session/${sessionId}/rounds/${round}/events`)}
              >
                Ver eventos da Rodada {round}
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
