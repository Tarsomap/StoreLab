export type AssistantProvider = 'openai' | 'groq' | 'none';

export interface AssistantAskRequest {
  question: string;
  sessionId?: string;
  storeId?: string;
}

export interface AssistantAskResponse {
  answer: string;
  provider: AssistantProvider;
  model: string | null;
  fallbackUsed: boolean;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: AssistantProvider;
  model?: string | null;
  fallbackUsed?: boolean;
}

export interface AssistantContext {
  sessionId?: string;
  storeId?: string;
}
