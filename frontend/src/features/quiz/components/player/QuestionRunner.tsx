'use client';

import type { QuizQuestion } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface QuestionRunnerProps {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, optionId: string) => void;
}

export function QuestionRunner({ questions, answers, onAnswer }: QuestionRunnerProps) {
  return (
    <>
      {questions.map((q, idx) => (
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
                  onClick={() => onAnswer(q.id, opt.id)}
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
    </>
  );
}
