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
import { PlanHeader } from "@/features/plan/components/PlanHeader";
import { PlanMetricCards } from "@/features/plan/components/PlanMetricCards";
import {
  DemandIndicatorsCard,
  StoreDemandIndicators,
} from "@/features/plan/components/DemandIndicatorsCard";
import { QuizBanner } from "@/features/plan/components/QuizBanner";
import { PlanDreSummary } from "@/features/plan/components/PlanDreSummary";
import { PlanCategoryTable } from "@/features/plan/components/PlanCategoryTable";
import { PlanCapexList } from "@/features/plan/components/PlanCapexList";
import { PlanConfirmButton } from "@/features/plan/components/PlanConfirmButton";
import { OperadoresForm } from "@/features/plan/components/OperadoresForm";

import { api } from "@/lib/api";

/** Tela colaborativa do PO: decisões por papel, DRE e sincronização em tempo re
al da loja. */
export default function PlanPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();

  const { plan, store, myRole, quizScore, isLoading, error, setPlan } =
    usePlan(storeId);
  const timerState = useRealtimeTimer(store?.sessionId);
  const timerExpired = useTimerExpiry(timerState);
  const { finish: finishRound } = usePlayerRoundFinish();
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

  const [demandIndicators, setDemandIndicators] =
    useState<StoreDemandIndicators | null>(null);

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
    if (storeId && plan?.configVersion) {
      api
        .get<StoreDemandIndicators | null>(
          `/results/store/${storeId}/round/${plan.configVersion}`,
        )
        .then((data) => setDemandIndicators(data))
        .catch(() => setDemandIndicators(null));
    }
  }, [storeId, plan?.configVersion]);

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

  // ── Mutations ──────────────────────────────────────────────────────────────

  async function handleMutate(path: string, body: unknown) {
    if (!plan) return;
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
      <PlanHeader
        storeName={store.name}
        roundLabel={`Rodada ${plan.configVersion}`}
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
        <div className="xl:sticky xl:top-[72px]">
          <PlanDreSummary dre={dre} />
        </div>

        <div className="space-y-4">
          <PlanCategoryTable
            rows={rows}
            plan={plan}
            stockAvailMap={stockAvailMap}
            editable={editable}
            saving={saving}
            onCategoryDecision={handleCategoryDecision}
            onMutate={handleMutate}
          />

          <Card className="shadow-sm">
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

          <PlanCapexList
            capexDecisions={plan.capexDecisions}
            planId={plan.id}
            editable={editable}
            saving={saving}
            onMutate={handleMutate}
          />

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
  );
}
