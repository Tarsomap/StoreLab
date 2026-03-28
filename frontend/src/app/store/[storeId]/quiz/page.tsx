'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizOption {
  id: string;
  label: string;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  order: number;
  options: QuizOption[];
}

interface QuizQuestionsResponse {
  round: number;
  alreadyAnswered: boolean;
  questions: QuizQuestion[];
}

interface SubmitResponse {
  correctAnswers: number;
  totalQuestions: number;
  scorePercentage: number; // 0–100
}

interface StoreSummary {
  id: string;
  sessionId: string;
  name: string;
}

interface SessionInfo {
  id: string;
  status: string;
}

interface PlayerAnsweredPayload {
  userId: string;
  storeId: string;
  round: number;
  answered: number;
  total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundFromStatus(status: string): number {
  if (status === 'ROUND_3') return 3;
  if (status === 'RECONFIGURATION' || status === 'ROUND_2') return 2;
  return 1;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [store, setStore] = useState<StoreSummary | null>(null);
  const [round, setRound] = useState(1);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [progress, setProgress] = useState<{ answered: number; total: number } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { on } = useSocket(store?.sessionId, storeId);

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        const storeData = await api.get<StoreSummary>(`/stores/${storeId}`);
        setStore(storeData);

        const sessionData = await api.get<SessionInfo>(
          `/sessions/${storeData.sessionId}/status`,
        );
        const r = roundFromStatus(sessionData.status);
        setRound(r);

        const quizData = await api.get<QuizQuestionsResponse>(
          `/stores/${storeId}/quiz?round=${r}`,
        );
        setQuestions(quizData.questions);
        setAlreadyAnswered(quizData.alreadyAnswered);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Erro ao carregar quiz');
      } finally {
        setLoading(false);
      }
    }
    if (user) init();
  }, [storeId, user]);

  // ── Socket ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return on<PlayerAnsweredPayload>('quiz:player-answered', (payload) => {
      if (payload.storeId === storeId && payload.round === round) {
        setProgress({ answered: payload.answered, total: payload.total });
      }
    });
  }, [on, storeId, round]);

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setSubmitError(`Responda todas as ${questions.length} perguntas antes de enviar.`);
      return;
    }

    setSubmitError('');
    setSubmitting(true);

    try {
      const payload = {
        round,
        answers: Object.entries(answers).map(([questionId, optionId]) => ({
          questionId,
          optionId,
        })),
      };
      const data = await api.post<SubmitResponse>(`/stores/${storeId}/quiz/submit`, payload);
      setResult(data);
      setAlreadyAnswered(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Erro ao enviar respostas');
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  // ── States ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando quiz...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Quiz — Rodada {round}</h1>
            {store && <Badge variant="secondary">{store.name}</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Team progress */}
        {progress && (
          <p className="text-sm text-center text-muted-foreground">
            {progress.answered} de {progress.total} membros responderam
          </p>
        )}

        {/* Result */}
        {result && (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl text-green-600">
                {result.correctAnswers}/{result.totalQuestions} corretas
              </CardTitle>
              <CardDescription>
                Score: {result.scorePercentage.toFixed(0)}%
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button variant="outline" onClick={() => router.push(`/store/${storeId}/plan`)}>
                Voltar ao Plano
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Already answered */}
        {alreadyAnswered && !result && (
          <Card className="text-center">
            <CardContent className="py-12">
              <p className="text-muted-foreground">
                Você já respondeu o quiz desta rodada. Aguarde os demais membros.
              </p>
            </CardContent>
          </Card>
        )}

        {/* No questions configured */}
        {!alreadyAnswered && questions.length === 0 && (
          <Card className="text-center">
            <CardContent className="py-12">
              <p className="text-muted-foreground">
                O facilitador ainda não configurou as perguntas desta rodada.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        {!alreadyAnswered &&
          questions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                  {q.prompt}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                      }
                      className={`w-full text-left px-4 py-2.5 rounded-md border text-sm transition-colors ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-input hover:bg-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          ))}

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
      </main>
    </div>
  );
}
