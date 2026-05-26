'use client';

import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GLOSSARY, GlossaryTerm } from '@/lib/term-glossary';

interface TermTooltipProps {
  term?: GlossaryTerm;
  content?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function TermTooltip({ term, content, side = 'top', className }: TermTooltipProps) {
  const text = content ?? (term ? GLOSSARY[term] : '');
  if (!text) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help focus:outline-none ${className ?? ''}`}
            tabIndex={-1}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-72 text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
