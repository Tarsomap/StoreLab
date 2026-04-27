'use client';

import type { QuestionDraft } from '../../types';
import { OPTION_LETTERS } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QuestionEditorProps {
  qi: number;
  question: QuestionDraft;
  hasError: boolean;
  onPromptChange: (value: string) => void;
  onOptionLabelChange: (oi: number, value: string) => void;
  onSetCorrectOption: (oi: number) => void;
}

export function QuestionEditor({
  qi,
  question,
  hasError,
  onPromptChange,
  onOptionLabelChange,
  onSetCorrectOption,
}: QuestionEditorProps) {
  return (
    <Card className={hasError ? 'border-destructive' : undefined}>
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
            value={question.prompt}
            onChange={(e) => onPromptChange(e.target.value)}
          />
        </div>

        {/* Options */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Opções — clique no círculo para marcar a resposta correta
          </p>
          <div className="space-y-2">
            {question.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                {/* Correct answer radio */}
                <button
                  type="button"
                  onClick={() => onSetCorrectOption(oi)}
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
                  onChange={(e) => onOptionLabelChange(oi, e.target.value)}
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
}
