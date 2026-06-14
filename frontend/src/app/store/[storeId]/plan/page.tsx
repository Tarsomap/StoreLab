"use client";

/**
 * Fluxo do jogador — Plano Operacional (`/store/[storeId]/plan`):
 * 1) Carrega loja, plano atual, papel do usuário, estoque compartilhado (GET) e status da sessão para saber `configVersion`.
 * 2) Campos por categoria e CAPEX; salvamento via API; confirmação do PO quando permitido.
 * 3) WebSocket `join:store` + evento `plan:updated`: quando outro membro altera algo, a tabela e o DRE atualizam sem recarregar a página.
 * 4) Coluna DRE mostra projeção local; `useAnimatedValue` destaca mudanças vindas do tempo real.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";
import { POSkeleton } from "@/components/skeletons/po-skeleton";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Users } from "lucide-react";
import { usePlan } from "@/features/plan/hooks/use-plan";
import { useRealtimePlan } from "@/features/plan/hooks/use-realtime-plan";
import { useRealtimeTimer } from "@/features/session/hooks/use-realtime-timer";
import { useTimerExpiry } from "@/features/session/hooks/use-timer-expiry";
import { usePlayerRoundFinish } from "@/features/session/hooks/use-player-round-finish";
import { TimerDisplay } from "@/features/session/components/TimerDisplay";
import { useStockAvailability } from "@/features/plan/hooks/use-stock-availability";
import { useSavePlan } from "@/features/plan/hooks/use-save-plan";
import { useSaveCategoryDecision } from "@/features/plan/hooks/use-save-category-decision";
import { useConfirmPlan } from "@/features/plan/hooks/use-confirm-plan";
import { buildCatRows, buildDre } from "@/features/plan/lib/plan-math";
import { PlanFullResponse, ConfirmState } from "@/features/plan/types";
import { useRandomEvents } from "@/features/random-events/hooks/use-random-events";
import { RandomEventModal } from "@/features/random-events/components/random-event-modal";
import { PlanHeader } from "@/features/plan/components/PlanHeader";
import { PlanMetricCards } from "@/features/plan/components/PlanMetricCards";
import { DemandIndicatorsCard } from "@/features/plan/components/DemandIndicatorsCard";
import { QuizBanner } from "@/features/plan/components/QuizBanner";
import { PlanDreSummary } from "@/features/plan/components/PlanDreSummary";
import { PlanCategoryTable } from "@/features/plan/components/PlanCategoryTable";
import { PlanCapexList } from "@/features/plan/components/PlanCapexList";
import { PlanConfirmButton } from "@/features/plan/components/PlanConfirmButton";
import { OperadoresForm } from "@/features/plan/components/OperadoresForm";
import { useDemandIndicators } from "@/features/plan/hooks/use-demand-indicators";
import { TutorialBModal } from "@/features/tutorial/components/TutorialBModal";
import { TutorialBCoachmarks } from "@/features/tutorial/components/TutorialBCoachmarks";
import { useTutorialStore } from "@/features/tutorial/store/tutorial-store";

/** Tela colaborativa do PO: decisões por papel, DRE e sincronização em tempo re
al da loja. */
export default function PlanPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();

  const {
    plan,
    store,
    myRole,
    quizScore,
    sessionRound,
    isLoading,
    error,
    setPlan,
  } = usePlan(storeId);
  const timerState = useRealtimeTimer(store?.sessionId);
  const timerExpired = useTimerExpiry(timerState);
  const { finish: finishRound } = usePlayerRoundFinish();
  const { pendingPayload, dismiss } = useRandomEvents(store?.sessionId ?? '', storeId);
  const { stockAvailMap, fetchStockAvailability } = useStockAvailability();
  const {
    mutate: savePlan,
    isLoading: savingPlan,
    error: savePlanError,
  } = useSavePlan();
  const {
    mutate: saveCategoryDecision,
    isLoading: savingCat,
    error: saveCatError,
  } = useSaveCategoryDecision();
  const { mutate: confirmPlan } = useConfirmPlan();

  const {
    hasSeenTutorialB,
    isTutorialBOpen,
    markTutorialBSeen,
    closeTutorialB,
  } = useTutorialStore();

  const [showTutorialBModal, setShowTutorialBModal] = useState(false);
  const [runCoachmarks, setRunCoachmarks] = useState(false);

  const effectiveRound = sessionRound ?? plan?.configVersion;
  const { data: demandIndicators } = useDemandIndicators(
    storeId,
    effectiveRound,
  );

  const handleRealtimeUpdate = useCallback(
    (updated: PlanFullResponse) => {
      setPlan(updated);
    },
    [setPlan],
  );
  useRealtimePlan(store?.sessionId, storeId, handleRealtimeUpdate);

  const saving = savingPlan || savingCat;
  const saveError = savePlanError ?? saveCatError ?? "";
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");

  const finFirst = useRef(true);
  const finPrevRef = useRef<{ e: number; c: number } | null>(null);

  // Fetch stock availability once we have store + plan
  useEffect(() => {
    if (store && plan) {
      fetchStockAvailability(store.sessionId, plan.configVersion);
    }
  }, [store, plan, fetchStockAvailability]);

  const rows = useMemo(
    () => (plan ? buildCatRows(plan.categoryDecisions) : []),
    [plan],
  );
  const dre = useMemo(
    () => (plan ? buildDre(rows, plan.financials) : null),
    [rows, plan],
  );

  const ebitdaFlash = useAnimatedValue(
    dre?.ebitda ?? 0,
    !!(plan && store),
    plan?.id ?? null,
  );
  const cashFlash = useAnimatedValue(
    plan?.financials.availableCash ?? 0,
    !!(plan && store),
    plan?.id ?? null,
  );

  useEffect(() => {
    finFirst.current = true;
    finPrevRef.current = null;
  }, [storeId, plan?.id]);

  useEffect(() => {
    setConfirmState("idle");
  }, [storeId, plan?.id]);

  useEffect(() => {
    if (!plan || !store || !dre) return;
    const e = dre.ebitda;
    const c = plan.financials.availableCash;
    if (finFirst.current) {
      finFirst.current = false;
      finPrevRef.current = { e, c };
      return;
    }
    const p = finPrevRef.current;
    if (p && (e !== p.e || c !== p.c)) {
      toast.info("Valores atualizados", { duration: 2000 });
    }
    finPrevRef.current = { e, c };
  }, [plan, store, dre]);

  // Auto-trigger Tutorial B on first visit (after data loads)
  useEffect(() => {
    if (!hasSeenTutorialB && plan && store) {
      setShowTutorialBModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, store?.id]);

  // Re-open Tutorial B via Help button
  useEffect(() => {
    if (isTutorialBOpen) {
      setShowTutorialBModal(true);
      closeTutorialB();
    }
  }, [isTutorialBOpen, closeTutorialB]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  // Atualização otimista de uma decisão de categoria: escreve os novos valores
  // no estado imediatamente, antes do round-trip HTTP. Sem isso, um evento
  // plan:updated de outro jogador chegando enquanto o save está em voo
  // sobrescreve o prop com dado obsoleto, e o useEffect do StockInput/MarginInput
  // reseta o draft para o valor antigo. Com o setPlan síncrono o value prop já
  // reflete o valor digitado, tornando o reset inofensivo.
  function withOptimisticCategory(
    current: PlanFullResponse,
    categoryId: string,
    stockPurchased: number,
    priceMargin: number,
  ): PlanFullResponse {
    return {
      ...current,
      categoryDecisions: current.categoryDecisions.map((d) =>
        d.categoryId === categoryId
          ? { ...d, stockPurchased, priceMargin, lineCost: stockPurchased * d.unitCost }
          : d,
      ),
    };
  }

  async function handleMutate(path: string, body: unknown) {
    if (!plan) return;
    // Mesmo motivo da atualização otimista acima, para os caminhos genéricos:
    // workforce (operadores) e a margem comercial (que comita via /category-decision).
    if (path.endsWith("workforce")) {
      const wf = body as { cashierOperators: number; serviceOperators: number };
      setPlan({
        ...plan,
        cashierOperators: wf.cashierOperators,
        serviceOperators: wf.serviceOperators,
      });
    } else if (path.endsWith("category-decision")) {
      const cd = body as {
        categoryId: string;
        stockPurchased: number;
        priceMargin: number;
      };
      setPlan(
        withOptimisticCategory(plan, cd.categoryId, cd.stockPurchased, cd.priceMargin),
      );
    }
    try {
      const updated = await savePlan(path, body);
      setPlan(updated);
    } catch {
      // error exposed via savePlanError from hook
    }
  }

  async function handleCategoryDecision(
    categoryId: string,
    stockPurchased: number,
    priceMargin: number,
  ) {
    if (!plan || !store) return;
    setPlan(withOptimisticCategory(plan, categoryId, stockPurchased, priceMargin));
    try {
      const updated = await saveCategoryDecision({
        planId: plan.id,
        categoryId,
        stockPurchased,
        priceMargin,
      });
      setPlan(updated);
      await fetchStockAvailability(store.sessionId, plan.configVersion);
    } catch {
      // error exposed via saveCatError from hook
    }
  }

  async function handleConfirm() {
    if (!plan) return;
    setConfirmState("loading");
    try {
      const updated = await confirmPlan(plan.id);
      setPlan(updated);
      setConfirmState("success");
      toast.success("PO confirmado com sucesso!");
      if (
        store?.sessionId &&
        timerState?.timerStartedAt &&
        !timerState.timerPausedAt
      ) {
        finishRound(store.sessionId).catch(() => {});
      }
    } catch (err) {
      setConfirmState("error");
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar PO");
      setTimeout(() => setConfirmState("idle"), 3000);
    }
  }

  // ── States ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }
  if (isLoading || !plan || !store || !dre) {
    return <POSkeleton />;
  }

  const editable = !plan.confirmed;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10">
      <TutorialBModal
        open={showTutorialBModal}
        onFinish={() => {
          setShowTutorialBModal(false);
          setRunCoachmarks(true);
        }}
        onSkip={() => {
          setShowTutorialBModal(false);
          markTutorialBSeen();
        }}
      />
      <TutorialBCoachmarks
        active={runCoachmarks}
        onDone={() => {
          setRunCoachmarks(false);
          markTutorialBSeen();
        }}
      />

      {pendingPayload && (
        <RandomEventModal
          round={pendingPayload.round}
          events={pendingPayload.events}
          onClose={dismiss}
        />
      )}
      <PlanHeader
        storeName={store.name}
        roundLabel={`Rodada ${sessionRound ?? plan.configVersion}`}
        editable={editable}
        saving={saving}
        confirmed={plan.confirmed}
      />

      {timerState && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm transition-colors ${
            timerExpired
              ? "border-destructive/30 bg-destructive/5"
              : "border-border bg-card"
          }`}
        >
          <span
            className={`text-sm font-medium ${timerExpired ? "text-destructive" : "text-muted-foreground"}`}
          >
            {timerExpired ? "Tempo esgotado!" : "Tempo restante na rodada"}
          </span>
          <TimerDisplay
            timerDuration={timerState.timerDuration}
            timerStartedAt={timerState.timerStartedAt}
            timerPausedAt={timerState.timerPausedAt}
            elapsedBeforePause={timerState.elapsedBeforePause}
            size="sm"
          />
        </div>
      )}

      <PlanMetricCards
        plan={plan}
        dre={dre}
        ebitdaFlash={ebitdaFlash}
        cashFlash={cashFlash}
      />

      <DemandIndicatorsCard indicators={demandIndicators} />

      {quizScore !== null && !plan.confirmed && (
        <QuizBanner
          quizScore={quizScore}
          onNavigateToQuiz={() => router.push(`/store/${storeId}/quiz`)}
        />
      )}

      {saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{saveError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5 items-start">
        <div id="tutorial-dre" className="xl:sticky xl:top-[72px]">
          <PlanDreSummary dre={dre} />
        </div>

        <div className="space-y-4">
          <div id="tutorial-category-table">
            <PlanCategoryTable
              rows={rows}
              plan={plan}
              stockAvailMap={stockAvailMap}
              editable={editable}
              saving={saving}
              onCategoryDecision={handleCategoryDecision}
              onMutate={handleMutate}
            />
          </div>

          <Card id="tutorial-operators" className="shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-display">
                Equipe Operacional
              </h2>
            </div>
            <Separator />
            <CardContent className="pt-4 pb-4">
              <OperadoresForm
                cashierOperators={plan.cashierOperators}
                serviceOperators={plan.serviceOperators}
                editable={editable}
                saving={saving}
                onSave={(cashier, service) =>
                  handleMutate(`/plans/${plan.id}/workforce`, {
                    cashierOperators: cashier,
                    serviceOperators: service,
                  })
                }
              />
            </CardContent>
          </Card>

          <div id="tutorial-capex">
            <PlanCapexList
              capexDecisions={plan.capexDecisions}
              planId={plan.id}
              editable={editable}
              saving={saving}
              onMutate={handleMutate}
            />
          </div>

          <div id="tutorial-confirm">
            <PlanConfirmButton
              myRole={myRole}
              plan={plan}
              saving={saving}
              confirmState={confirmState}
              onConfirm={handleConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
