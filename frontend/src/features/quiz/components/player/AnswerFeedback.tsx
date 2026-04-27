'use client';

import { Card, CardContent } from '@/components/ui/card';

interface AnswerFeedbackProps {
  type: 'already-answered' | 'no-questions';
}

export function AnswerFeedback({ type }: AnswerFeedbackProps) {
  return (
    <Card className="text-center">
      <CardContent className="py-12">
        <p className="text-muted-foreground">
          {type === 'already-answered'
            ? 'Você já respondeu o quiz desta rodada. Aguarde os demais membros.'
            : 'O facilitador ainda não configurou as perguntas desta rodada.'}
        </p>
      </CardContent>
    </Card>
  );
}
