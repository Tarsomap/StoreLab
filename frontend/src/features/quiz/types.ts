// From facilitator page (lines 30–52)
export interface OptionDraft { label: string; isCorrect: boolean; }
export interface QuestionDraft { prompt: string; options: OptionDraft[]; }
export interface SavedOption { id: string; label: string; isCorrect: boolean; }
export interface SavedQuestion { id: string; prompt: string; order: number; options: SavedOption[]; }

// From player page (lines 27–68)
export interface QuizOption { id: string; label: string; }
export interface QuizQuestion { id: string; prompt: string; order: number; options: QuizOption[]; }
export interface QuizQuestionsResponse { round: number; alreadyAnswered: boolean; questions: QuizQuestion[]; }
export interface SubmitResponse { correctAnswers: number; totalQuestions: number; scorePercentage: number; }
export interface StoreSummary { id: string; sessionId: string; name: string; }
export interface SessionInfo { id: string; status: string; }
export interface PlayerAnsweredPayload { userId: string; storeId: string; round: number; answered: number; total: number; }

// Helpers/Constants as exports
export const QUESTIONS_COUNT = 10;
export const OPTIONS_COUNT = 4;
export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
