'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTIONS_COUNT = 10;
const OPTIONS_COUNT = 4;
const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface OptionDraft {
  label: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  prompt: string;
  options: OptionDraft[];
}

interface SavedOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

interface SavedQuestion {
  id: string;
  prompt: string;
  order: number;
  options: SavedOption[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBlankQuestion(): QuestionDraft {
  return {
    prompt: '',
    options: Array.from({ length: OPTIONS_COUNT }, () => ({
      label: '',
      isCorrect: false,
    })),
  };
}

function makeBlankQuestions(): QuestionDraft[] {
  return Array.from({ length: QUESTIONS_COUNT }, makeBlankQuestion);
}

function fromSaved(saved: SavedQuestion[]): QuestionDraft[] {
  const drafts = makeBlankQuestions();
  for (const q of saved) {
    const idx = q.order - 1;
    if (idx >= 0 && idx < QUESTIONS_COUNT) {
      drafts[idx] = {
        prompt: q.prompt,
        options: q.options.map((o) => ({ label: o.label, isCorrect: o.isCorrect })),
      };
    }
  }
  return drafts;
}

function validate(questions: QuestionDraft[]): string[] {
  const errors: string[] = [];
  questions.forEach((q, qi) => {
    if (!q.prompt.trim()) {
      errors.push(`Pergunta ${qi + 1}: o texto é obrigatório.`);
    }
    const emptyOpts = q.options.filter((o) => !o.label.trim());
    if (emptyOpts.length > 0) {
      errors.push(`Pergunta ${qi + 1}: preencha todas as 4 opções.`);
    }
    const correctCount = q.options.filter((o) => o.isCorrect).length;
    if (correctCount === 0) {
      errors.push(`Pergunta ${qi + 1}: marque qual opção é correta.`);
    } else if (correctCount > 1) {
      errors.push(`Pergunta ${qi + 1}: apenas 1 opção pode ser correta.`);
    }
  });
  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuizManagementPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const [round, setRound] = useState<1 | 2 | 3>(1);
  const [questions, setQuestions] = useState<QuestionDraft[]>(makeBlankQuestions);
  const [savedCount, setSavedCount] = useState<Record<1 | 2 | 3, number>>({ 1: 0, 2: 0, 3: 0 });
  const [loadingRound, setLoadingRound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const fetchRound = useCallback(
    async (r: 1 | 2 | 3) => {
      setLoadingRound(true);
      setSaveError('');
      setSaveSuccess(false);
      setValidationErrors([]);
      try {
        const data = await api.get<SavedQuestion[]>(
          `/sessions/${sessionId}/quiz/questions?round=${r}`,
        );
        setSavedCount((prev) => ({ ...prev, [r]: data.length }));
        setQuestions(fromSaved(data));
      } catch {
        // No questions saved yet — start with blank form
        setQuestions(makeBlankQuestions());
      } finally {
        setLoadingRound(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    fetchRound(round);
  }, [round, fetchRound]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

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
    const errors = validate(questions);
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

  // ── Render ───────────────────────────────────────────────────────────────────

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
        {/* Round selector */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Rodada:</span>
              {([1, 2, 3] as const).map((r) => (
                <Button
                  key={r}
                  variant={round === r ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSelectRound(r)}
                  disabled={loadingRound}
                  className="relative"
                >
                  Rodada {r}
                  {savedCount[r] === QUESTIONS_COUNT && (
                    <span className="ml-1.5 text-xs opacity-80">✓</span>
                  )}
                </Button>
              ))}
              <span className="ml-auto text-sm text-muted-foreground">
                {savedCount[round] === QUESTIONS_COUNT ? (
                  <span className="text-green-600 font-medium">10 perguntas salvas</span>
                ) : savedCount[round] > 0 ? (
                  `${savedCount[round]} de 10 perguntas salvas`
                ) : (
                  'Nenhuma pergunta salva ainda'
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Info banner */}
        <div className="text-sm text-muted-foreground bg-card border rounded-lg px-4 py-3 flex gap-2">
          <span className="text-blue-500">ℹ</span>
          <span>
            Configure exatamente <strong>10 perguntas</strong> por rodada, cada uma com{' '}
            <strong>4 opções</strong> e <strong>1 resposta correta</strong>.
            O quiz precisa estar configurado antes dos jogadores confirmarem o PO.
          </span>
        </div>

        {/* Loading */}
        {loadingRound && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Carregando perguntas da Rodada {round}...
          </div>
        )}

        {/* Questions form */}
        {!loadingRound &&
          questions.map((q, qi) => {
            const hasError = validationErrors.some((e) => e.startsWith(`Pergunta ${qi + 1}:`));
            return (
              <Card
                key={qi}
                className={hasError ? 'border-destructive' : undefined}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Pergunta {qi + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Prompt */}
                  <div className="space-y-1.5">
                    <Label htmlFor={`prompt-${qi}`}>Texto da pergunta</Label>
                    <Input
                      id={`prompt-${qi}`}
                      placeholder="Ex: O que significa EBITDA?"
                      value={q.prompt}
                      onChange={(e) => updatePrompt(qi, e.target.value)}
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Opções — clique no círculo para marcar a resposta correta
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          {/* Correct answer radio */}
                          <button
                            type="button"
                            onClick={() => setCorrectOption(qi, oi)}
                            title="Marcar como resposta correta"
                            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              opt.isCorrect
                                ? 'border-green-500 bg-green-500'
                                : 'border-muted-foreground/40 hover:border-green-400'
                            }`}
                          />
                          {/* Option letter badge */}
                          <span
                            className={`flex-shrink-0 w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
                              opt.isCorrect
                                ? 'bg-green-100 text-green-700'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {OPTION_LETTERS[oi]}
                          </span>
                          {/* Option label */}
                          <Input
                            placeholder={`Opção ${OPTION_LETTERS[oi]}`}
                            value={opt.label}
                            onChange={(e) => updateOptionLabel(qi, oi, e.target.value)}
                            className={
                              opt.isCorrect ? 'border-green-300 focus-visible:ring-green-400' : ''
                            }
                          />
                          {opt.isCorrect && (
                            <span className="flex-shrink-0 text-xs text-green-600 font-medium w-14 text-right">
                              Correta
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

        {/* Validation errors summary */}
        {validationErrors.length > 0 && (
          <Card className="border-destructive">
            <CardContent className="pt-4 pb-4 space-y-1">
              <p className="text-sm font-medium text-destructive mb-2">
                Corrija os erros abaixo antes de salvar:
              </p>
              {validationErrors.map((e, i) => (
                <p key={i} className="text-sm text-destructive">
                  • {e}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Save */}
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
