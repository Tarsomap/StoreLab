'use client';

/**
 * Fluxo do jogador — Quiz (`/store/[storeId]/quiz`):
 * 1) Descobre rodada pela fase da sessão; GET `/stores/:id/quiz?round=` traz perguntas ou "já respondeu".
 * 2) WebSocket `quiz:player-answered` na sala da loja atualiza "quantos membros responderam" em tempo real.
 * 3) POST `/stores/:id/quiz/submit` envia todas as respostas; a tela mostra aproveitamento e bloqueia novo envio.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { usePlayerQuiz } from '@/features/quiz/hooks';
import { useSubmitAnswer } from '@/features/quiz/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QuestionRunner, AnswerFeedback, ScoreCard } from '@/features/quiz/components/player';

/** Questionário da rodada para o time da loja; progresso coletivo via Socket.io. */
export default function QuizPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const {
    store,
    round,
    questions,
    alreadyAnswered,
    progress,
    loading,
    error,
    setAlreadyAnswered,
  } = usePlayerQuiz(storeId);

  const { submit, submitting, result } = useSubmitAnswer(storeId);

  async function handleSubmit() {
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setSubmitError(`Responda todas as ${questions.length} perguntas antes de enviar.`);
      return;
    }
    setSubmitError('');
    const answerEntries = Object.entries(answers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }));
    await submit(round, answerEntries);
    setAlreadyAnswered(true);
  }

  // ── States ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando quiz...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Quiz title */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-display font-bold">Quiz — Rodada {round}</h1>
        {store && <Badge variant="secondary">{store.name}</Badge>}
      </div>

      {/* Team progress */}
      {progress && (
        <p className="text-sm text-center text-muted-foreground">
          {progress.answered} de {progress.total} membros responderam
        </p>
      )}

      {/* Result */}
      {result && <ScoreCard result={result} storeId={storeId} />}

      {/* Already answered */}
      {alreadyAnswered && !result && <AnswerFeedback type="already-answered" />}

      {/* No questions configured */}
      {!alreadyAnswered && questions.length === 0 && <AnswerFeedback type="no-questions" />}

      {/* Questions */}
      {!alreadyAnswered && questions.length > 0 && (
        <QuestionRunner
          questions={questions}
          answers={answers}
          onAnswer={(qId, optId) => setAnswers((prev) => ({ ...prev, [qId]: optId }))}
        />
      )}

      {/* Submit */}
      {!alreadyAnswered && questions.length > 0 && (
        <div className="space-y-2">
          {submitError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              {submitError}
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? 'Enviando...'
                : `Enviar ${Object.keys(answers).length}/${questions.length} respostas`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
