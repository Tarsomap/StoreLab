'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface StoreScoreResponse {
  storeId: string;
  round: number;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  membersAnswered: number;
  totalMembers: number;
}

interface QuizPlayerAnsweredPayload {
  userId: string;
  storeId: string;
  round: number;
  answered: number;
  total: number;
}

export interface QuizProgressStoreRow {
  storeId: string;
  storeName: string;
  memberCount: number;
}

interface SessionQuizProgressProps {
  sessionId: string;
  quizRound: 1 | 2 | 3;
  stores: QuizProgressStoreRow[];
}

export function SessionQuizProgress({ sessionId, quizRound, stores }: SessionQuizProgressProps) {
  const storeIds = useMemo(() => stores.map((s) => s.storeId), [stores]);
  const storeIdSet = useMemo(() => new Set(storeIds), [storeIds]);

  const [progressByStore, setProgressByStore] = useState<
    Record<string, { answered: number; total: number }>
  >({});

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStoreId, setSheetStoreId] = useState<string | null>(null);
  const [sheetScore, setSheetScore] = useState<StoreScoreResponse | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState('');

  const { on } = useSocket(sessionId, undefined, storeIds);

  const loadProgressFromApi = useCallback(async () => {
    const next: Record<string, { answered: number; total: number }> = {};
    await Promise.all(
      stores.map(async (s) => {
        try {
          const d = await api.get<StoreScoreResponse>(
            `/stores/${s.storeId}/quiz/score?round=${quizRound}`,
          );
          next[s.storeId] = {
            answered: d.membersAnswered,
            total: d.totalMembers > 0 ? d.totalMembers : Math.max(1, s.memberCount),
          };
        } catch {
          next[s.storeId] = {
            answered: 0,
            total: Math.max(1, s.memberCount),
          };
        }
      }),
    );
    setProgressByStore(next);
  }, [stores, quizRound]);

  useEffect(() => {
    void loadProgressFromApi();
  }, [loadProgressFromApi]);

  useEffect(() => {
    return on<QuizPlayerAnsweredPayload>('quiz:player-answered', (payload) => {
      if (payload.round !== quizRound) return;
      if (!storeIdSet.has(payload.storeId)) return;
      setProgressByStore((prev) => ({
        ...prev,
        [payload.storeId]: { answered: payload.answered, total: payload.total },
      }));
    });
  }, [on, quizRound, storeIdSet]);

  const sheetStoreName = stores.find((s) => s.storeId === sheetStoreId)?.storeName ?? 'Loja';

  async function openSheet(storeId: string) {
    setSheetStoreId(storeId);
    setSheetOpen(true);
    setSheetScore(null);
    setSheetError('');
    setSheetLoading(true);
    try {
      const d = await api.get<StoreScoreResponse>(
        `/stores/${storeId}/quiz/score?round=${quizRound}`,
      );
      setSheetScore(d);
    } catch {
      setSheetError('Não foi possível carregar o score desta loja.');
    } finally {
      setSheetLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">Progresso do Quiz</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rodada {quizRound} · acompanhe quantos membros de cada loja já responderam.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {stores.map((store) => {
            const prog = progressByStore[store.storeId];
            const answered = prog?.answered ?? 0;
            const total = prog?.total ?? Math.max(1, store.memberCount);
            const pct = total > 0 ? (answered / total) * 100 : 0;
            const done = total > 0 && answered >= total;

            return (
              <button
                key={store.storeId}
                type="button"
                onClick={() => openSheet(store.storeId)}
                className="text-left rounded-xl transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="h-full border shadow-sm hover:border-border cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="font-display font-semibold text-base">
                        {store.storeName}
                      </CardTitle>
                      {done ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-accent/30 bg-accent/10 text-accent hover:bg-accent/10"
                        >
                          Concluído
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <p className="text-xs text-muted-foreground">
                      {answered} de {total} membros responderam
                    </p>
                    <Progress value={pct} />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) {
            setTimeout(() => {
              setSheetStoreId(null);
              setSheetScore(null);
              setSheetError('');
            }, 350);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-0 bg-card p-0 shadow-xl"
        >
          <SheetHeader className="space-y-0 border-b border-border px-4 py-3 pr-12 text-left sm:text-left">
            <SheetTitle className="font-display text-base font-semibold leading-tight">
              Respostas — {sheetStoreName}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Score consolidado da equipe nesta rodada. Respostas individuais por jogador não são exibidas.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {sheetLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : sheetError ? (
              <p className="text-sm text-destructive">{sheetError}</p>
            ) : sheetScore ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Aproveitamento da loja
                  </p>
                  <p className="font-mono text-4xl font-bold tabular-nums text-foreground">
                    {sheetScore.scorePercentage.toFixed(1)}%
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Total de acertos</p>
                  <p className="font-mono text-lg font-semibold text-foreground mt-1">
                    {sheetScore.correctAnswers} de {sheetScore.totalQuestions} questões corretas
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Score consolidado da equipe. Respostas individuais por jogador não são exibidas.
                </p>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
