'use client';

import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../types';

interface AssistantPanelProps {
  open: boolean;
  messages: AssistantMessage[];
  isLoading: boolean;
  error: string;
  onClose: () => void;
  onAsk: (question: string) => void;
  onRetry: () => void;
  onReset: () => void;
}

const SUGGESTIONS = [
  'Por que meu EBITDA caiu?',
  'Como melhorar CSAT?',
  'O que impactou meu caixa?',
];

function providerLabel(message: AssistantMessage) {
  if (!message.provider || message.provider === 'none') return null;
  return `${message.provider}${message.model ? ` · ${message.model}` : ''}`;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function AssistantMarkdown({ content }: { content: string }) {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const isList = lines.every((line) => line.startsWith('- '));
        const key = `${blockIndex}-${block.slice(0, 16)}`;

        if (isList) {
          return (
            <ul key={key} className="space-y-2 pl-1">
              {lines.map((line, lineIndex) => (
                <li key={`${key}-${lineIndex}`} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>{renderInlineMarkdown(line.slice(2))}</span>
                </li>
              ))}
            </ul>
          );
        }

        const isFormula = block.includes('=') && block.length <= 120;

        return (
          <p
            key={key}
            className={cn(
              'whitespace-pre-wrap',
              isFormula && 'rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground',
            )}
          >
            {renderInlineMarkdown(block)}
          </p>
        );
      })}
    </div>
  );
}

export function AssistantPanel({
  open,
  messages,
  isLoading,
  error,
  onClose,
  onAsk,
  onRetry,
  onReset,
}: AssistantPanelProps) {
  const [question, setQuestion] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isLoading, open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;
    onAsk(trimmed);
    setQuestion('');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm pointer-events-auto sm:hidden" onClick={onClose} />

      <Card className="pointer-events-auto fixed bottom-4 right-4 top-4 flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border shadow-2xl sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(640px,calc(100vh-7rem))] sm:w-[420px]">
        <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10">
              <Bot className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-sm font-bold">Assistente StoreLab</h2>
              <p className="truncate text-xs text-primary-foreground/70">Contextual ao jogo</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onReset}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                aria-label="Limpar conversa"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              aria-label="Fechar assistente"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-background p-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Sparkles className="h-7 w-7" aria-hidden />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">Pergunte sobre a rodada</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Use o assistente para entender indicadores, caixa, PO, ranking e decisões da loja.
              </p>
              <div className="mt-5 flex w-full flex-col gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start rounded-xl text-left"
                    onClick={() => onAsk(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            const label = providerLabel(message);
            return (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'rounded-xl px-3 py-2 shadow-sm',
                    message.role === 'user'
                      ? 'max-w-[86%] bg-primary text-sm text-primary-foreground'
                      : 'max-w-[94%] border bg-card text-card-foreground sm:max-w-[92%]',
                  )}
                >
                  {message.role === 'assistant' ? (
                    <AssistantMarkdown content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  )}
                  {message.role === 'assistant' && (label || message.fallbackUsed) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2">
                      {label && (
                        <Badge variant="secondary" className="font-mono text-[10px] font-medium">
                          {label}
                        </Badge>
                      )}
                      {message.fallbackUsed && (
                        <Badge variant="warning" className="text-[10px] font-medium">
                          fallback
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[86%] items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Analisando contexto...
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-destructive">Não consegui responder agora</p>
                  <p className="mt-0.5 text-xs text-destructive/80">{error}</p>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" className="mt-3 h-8" onClick={onRetry}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>

        <Separator />

        <form onSubmit={submit} className="bg-card p-3">
          <label htmlFor="assistant-question" className="sr-only">Pergunta para o assistente</label>
          <div className="flex items-end gap-2">
            <textarea
              id="assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Pergunte sobre EBITDA, CSAT, caixa..."
              rows={2}
              disabled={isLoading}
              className="min-h-[44px] max-h-28 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button type="submit" size="icon" className="h-11 w-11 rounded-xl" disabled={isLoading || !question.trim()} aria-label="Enviar pergunta">
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
