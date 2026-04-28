'use client';

/**
 * Fluxo do facilitador — Quiz (`/dashboard/session/[id]/quiz`):
 * 1) Escolhe rodada 1, 2 ou 3; GET carrega perguntas salvas ou formulário em branco (10×4 opções).
 * 2) Validação local antes de POST `/sessions/:id/quiz/questions` — uma resposta correta por pergunta.
 * 3) Após salvar, indicador ✓ na aba; jogadores usam essas perguntas na tela de quiz da loja.
 */
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useQuestions } from '@/features/quiz/hooks';
import { validateQuestions } from '@/features/quiz/lib';
import { QUESTIONS_COUNT } from '@/features/quiz/types';
import type { QuestionDraft } from '@/features/quiz/types';
import { ProgressBoard, QuestionsList } from '@/features/quiz/components/facilitator';
import { Button } from '@/components/ui/button';

/** Formulário completo de cadastro do quiz por rodada. */
export default function QuizManagementPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const [round, setRound] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // savedCount per round — updated after each successful load or save
  const [savedCount, setSavedCount] = useState<Record<1 | 2 | 3, number>>({ 1: 0, 2: 0, 3: 0 });

  // Hook loads questions from API for the selected round
  const { questions: loadedQuestions, savedCount: roundSavedCount, loading: loadingRound } =
    useQuestions(sessionId, round);

  // Local editable copy — synced from hook when round changes
  const [questions, setQuestions] = useState<QuestionDraft[]>(loadedQuestions);

  useEffect(() => {
    setQuestions(loadedQuestions);
    setSavedCount((prev) => ({ ...prev, [round]: roundSavedCount }));
    setSaveError('');
    setSaveSuccess(false);
    setValidationErrors([]);
  }, [loadedQuestions, round, roundSavedCount]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleSelectRound(r: 1 | 2 | 3) {
    if (r !== round) setRound(r);
  }

  function updatePrompt(qi: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qi ? { ...q, prompt: value } : q)),
    );
  }

  function updateOptionLabel(qi: number, oi: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, label: value } : o)) }
          : q,
      ),
    );
  }

  function setCorrectOption(qi: number, oi: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })) }
          : q,
      ),
    );
  }

  async function handleSave() {
    const errors = validateQuestions(questions);
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await api.post(`/sessions/${sessionId}/quiz/questions`, {
        round,
        questions: questions.map((q, idx) => ({
          prompt: q.prompt.trim(),
          order: idx + 1,
          options: q.options.map((o) => ({
            label: o.label.trim(),
            isCorrect: o.isCorrect,
          })),
        })),
      });
      setSaveSuccess(true);
      setSavedCount((prev) => ({ ...prev, [round]: QUESTIONS_COUNT }));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Erro ao salvar perguntas');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/session/${sessionId}`)}
          className="text-muted-foreground px-0 hover:bg-transparent"
        >
          ← Sessão
        </Button>
        <span>/</span>
        <span className="font-medium text-foreground">Gerenciar Quiz</span>
      </div>

      <ProgressBoard
        round={round}
        savedCount={savedCount}
        loadingRound={loadingRound}
        onSelectRound={handleSelectRound}
      />

      <QuestionsList
        questions={questions}
        validationErrors={validationErrors}
        loadingRound={loadingRound}
        onPromptChange={updatePrompt}
        onOptionLabelChange={updateOptionLabel}
        onSetCorrectOption={setCorrectOption}
      />

      {/* Save area */}
      {!loadingRound && (
        <div className="space-y-3 pb-8">
          {saveError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              ✓ Perguntas da Rodada {round} salvas com sucesso!
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? 'Salvando...' : `Salvar perguntas da Rodada ${round}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
