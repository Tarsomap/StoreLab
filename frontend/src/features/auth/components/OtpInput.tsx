'use client';

import { useRef, ClipboardEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  chars: string[];
  onChange: (chars: string[]) => void;
}

/** 6 campos OTP com navegação por teclado e suporte a colar código completo. */
export function OtpInput({ chars, onChange }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const accessCode = chars.join('');
  const codeComplete = accessCode.length === 6;

  function handleCharChange(idx: number, value: string) {
    const char = value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const next = [...chars];
    next[idx] = char;
    onChange(next);
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleCharKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    onChange(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="space-y-3">
      <div
        className="flex gap-2.5 justify-center rounded-2xl py-3 px-2"
        style={{
          background: codeComplete ? 'hsl(142 71% 45% / 0.06)' : 'transparent',
          boxShadow: codeComplete ? '0 0 0 2px hsl(142 71% 45% / 0.25)' : 'none',
          transition: 'background 400ms, box-shadow 400ms',
        }}
      >
        {chars.map((char, idx) => (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el; }}
            type="text"
            inputMode="text"
            maxLength={2}
            value={char}
            onChange={(e) => handleCharChange(idx, e.target.value)}
            onKeyDown={(e) => handleCharKeyDown(idx, e)}
            onPaste={idx === 0 ? handlePaste : undefined}
            className={cn(
              'w-12 h-[3.75rem] text-center text-2xl font-mono font-bold uppercase rounded-xl border-2 bg-background outline-none select-none',
              char ? 'border-accent text-foreground' : 'border-border text-foreground',
              'focus:border-primary focus:ring-0',
            )}
            style={char ? { boxShadow: '0 0 0 4px hsl(142 71% 45% / 0.12)' } : undefined}
          />
        ))}
      </div>

      {codeComplete ? (
        <p className="text-xs text-accent text-center font-body flex items-center justify-center gap-1.5 font-medium">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
          </svg>
          Código completo — selecione seu papel abaixo
        </p>
      ) : (
        <p className="text-xs text-muted-foreground text-center font-body">
          Cole ou digite o código da sua loja
        </p>
      )}
    </div>
  );
}
