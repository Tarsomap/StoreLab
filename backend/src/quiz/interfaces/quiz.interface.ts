export interface QuizOptionPublic {
  id: string;
  label: string;
}

export interface QuizOptionWithAnswer extends QuizOptionPublic {
  isCorrect: boolean;
}

export interface QuizQuestionPublic {
  id: string;
  prompt: string;
  order: number;
  options: QuizOptionPublic[];
}

export interface QuizQuestionWithAnswer {
  id: string;
  prompt: string;
  order: number;
  options: QuizOptionWithAnswer[];
}

export interface PlayerQuizResponse {
  round: number;
  alreadyAnswered: boolean;
  questions: QuizQuestionPublic[];
}

export interface SubmitAnswersResponse {
  correctAnswers: number;
  totalQuestions: number;
  scorePercentage: number;
}

export interface StoreScoreResponse {
  storeId: string;
  round: number;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  membersAnswered: number;
  totalMembers: number;
}
