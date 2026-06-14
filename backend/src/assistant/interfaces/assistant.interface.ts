export type AssistantProvider = "openai" | "groq";

export interface AssistantAskResponse {
  answer: string;
  provider: AssistantProvider | "none";
  model: string | null;
  fallbackUsed: boolean;
}

export interface LlmAskParams {
  systemPrompt: string;
  userQuestion: string;
}

export interface LlmAskResponse {
  answer: string;
  provider: AssistantProvider;
  model: string;
  fallbackUsed: boolean;
}
