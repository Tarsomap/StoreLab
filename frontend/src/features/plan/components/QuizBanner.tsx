import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';
import { PlayerScoreResponse } from '../types';

export function QuizBanner({
  quizScore,
  onNavigateToQuiz,
}: {
  quizScore: PlayerScoreResponse;
  onNavigateToQuiz: () => void;
}) {

  if (quizScore.answered) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/8 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
          <CheckCircle2 className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-accent">Quiz respondido</p>
          <p className="text-xs text-muted-foreground font-mono">
            {quizScore.correctAnswers}/{quizScore.totalQuestions} corretas · {quizScore.scorePercentage.toFixed(0)}% de acerto
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${quizScore.scorePercentage}%` }}
            />
          </div>
          <span className="text-xs font-mono text-accent font-bold">{quizScore.scorePercentage.toFixed(0)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-warning/40 bg-warning/8 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15">
          <BookOpen className="h-4 w-4 text-warning" />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--warning))' }}>
            Quiz pendente
          </p>
          <p className="text-xs text-muted-foreground">
            Responda o Quiz antes de confirmar o Plano Operacional
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="shrink-0 gap-1.5 font-semibold"
        style={{ backgroundColor: 'hsl(var(--warning))', color: 'hsl(var(--warning-foreground))' }}
        onClick={onNavigateToQuiz}
      >
        Fazer Quiz
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
