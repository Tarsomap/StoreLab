import type { QuestionDraft } from '../types';

/** Lista mensagens amigáveis se faltar texto, opção ou se houver mais de uma correta. */
export function validateQuestions(questions: QuestionDraft[]): string[] {
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

export { makeBlankQuestion, makeBlankQuestions, fromSaved } from '../hooks/use-questions';
