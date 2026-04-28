'use client';

import type { QuestionDraft } from '../../types';
import { QuestionEditor } from './QuestionEditor';
import { Card, CardContent } from '@/components/ui/card';

interface QuestionsListProps {
  questions: QuestionDraft[];
  validationErrors: string[];
  loadingRound: boolean;
  onPromptChange: (qi: number, value: string) => void;
  onOptionLabelChange: (qi: number, oi: number, value: string) => void;
  onSetCorrectOption: (qi: number, oi: number) => void;
}

export function QuestionsList({
  questions,
  validationErrors,
  loadingRound,
  onPromptChange,
  onOptionLabelChange,
  onSetCorrectOption,
}: QuestionsListProps) {
  if (loadingRound) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Carregando perguntas...
      </div>
    );
  }

  return (
    <>
      {questions.map((q, qi) => {
        const hasError = validationErrors.some((e) => e.startsWith(`Pergunta ${qi + 1}:`));
        return (
          <QuestionEditor
            key={qi}
            qi={qi}
            question={q}
            hasError={hasError}
            onPromptChange={(value) => onPromptChange(qi, value)}
            onOptionLabelChange={(oi, value) => onOptionLabelChange(qi, oi, value)}
            onSetCorrectOption={(oi) => onSetCorrectOption(qi, oi)}
          />
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
    </>
  );
}
