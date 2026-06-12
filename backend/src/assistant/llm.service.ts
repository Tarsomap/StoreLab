import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import OpenAI from "openai";
import {
  AssistantProvider,
  LlmAskParams,
  LlmAskResponse,
} from "./interfaces/assistant.interface";

type ChatRole = "system" | "user";

type ChatCompletionRequest = {
  model: string;
  messages: { role: ChatRole; content: string }[];
  max_completion_tokens: number;
  temperature: number;
  reasoning_effort?: ReasoningEffort;
};

type ChatCompletionResponse = {
  choices: {
    message?: {
      content?: string | null;
    };
  }[];
};

type LlmClient = {
  chat: {
    completions: {
      create(params: ChatCompletionRequest): Promise<ChatCompletionResponse>;
    };
  };
};

type ProviderConfig = {
  provider: AssistantProvider;
  apiKey: string | undefined;
  baseURL?: string;
  primaryModel: string | undefined;
  fallbackModels: string[];
};

type LlmErrorShape = {
  status?: unknown;
  statusCode?: unknown;
  headers?: unknown;
  message?: unknown;
};

type MissingApiKeyError = {
  provider: AssistantProvider;
  reason: "missing-api-key";
};

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

const FALLBACK_STATUSES = new Set([429, 500, 502, 503, 504]);
const NON_FALLBACK_STATUSES = new Set([400, 401, 403, 404]);
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const MAX_RETRY_AFTER_MS = 3_000;
const DEFAULT_MAX_COMPLETION_TOKENS = 420;
const REASONING_EFFORTS = new Set<ReasoningEffort>([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);

@Injectable()
export class LlmService {
  async ask(params: LlmAskParams): Promise<LlmAskResponse> {
    const attempts = this.buildAttempts();
    if (attempts.length === 0) {
      throw new ServiceUnavailableException(
        "Nenhum modelo de IA foi configurado para o assistente.",
      );
    }

    let lastError: unknown;

    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      if (!attempt.config.apiKey) {
        lastError = {
          provider: attempt.config.provider,
          reason: "missing-api-key",
        } satisfies MissingApiKeyError;
        continue;
      }

      try {
        const answer = await this.callModel({
          provider: attempt.config.provider,
          apiKey: attempt.config.apiKey,
          baseURL: attempt.config.baseURL,
          model: attempt.model,
          systemPrompt: params.systemPrompt,
          userQuestion: params.userQuestion,
        });

        return {
          answer,
          provider: attempt.config.provider,
          model: attempt.model,
          fallbackUsed: index > 0,
        };
      } catch (error) {
        lastError = error;
        const status = this.getStatus(error);

        if (status !== null && NON_FALLBACK_STATUSES.has(status)) {
          throw error;
        }

        if (status !== null && FALLBACK_STATUSES.has(status)) {
          await this.waitForRetryAfter(error);
          continue;
        }

        throw error;
      }
    }

    throw new ServiceUnavailableException(
      "O assistente de IA está temporariamente indisponível. Tente novamente mais tarde.",
      { cause: lastError },
    );
  }

  protected createClient(params: {
    apiKey: string;
    baseURL?: string;
  }): LlmClient {
    return new OpenAI({
      apiKey: params.apiKey,
      baseURL: params.baseURL,
    }) as unknown as LlmClient;
  }

  private async callModel(params: {
    provider: AssistantProvider;
    apiKey: string;
    baseURL?: string;
    model: string;
    systemPrompt: string;
    userQuestion: string;
  }): Promise<string> {
    const client = this.createClient({
      apiKey: params.apiKey,
      baseURL: params.baseURL,
    });

    const request: ChatCompletionRequest = {
      model: params.model,
      max_completion_tokens: this.readPositiveNumber(
        "ASSISTANT_MAX_TOKENS",
        DEFAULT_MAX_COMPLETION_TOKENS,
      ),
      temperature: this.readNumber("ASSISTANT_TEMPERATURE", 0.2),
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userQuestion },
      ],
    };

    const reasoningEffort = this.getReasoningEffort(params.provider, params.model);
    if (reasoningEffort) {
      request.reasoning_effort = reasoningEffort;
    }

    const response = await client.chat.completions.create(request);

    return (
      response.choices[0]?.message?.content?.trim() ||
      "Não consegui gerar uma resposta em texto."
    );
  }

  private buildAttempts(): { config: ProviderConfig; model: string }[] {
    const providerOrder = this.readProviderOrder();
    const configs = new Map<AssistantProvider, ProviderConfig>([
      [
        "openai",
        {
          provider: "openai",
          apiKey: process.env.OPENAI_API_KEY,
          primaryModel:
            process.env.ASSISTANT_MODEL ??
            process.env.OPENAI_ASSISTANT_MODEL ??
            DEFAULT_OPENAI_MODEL,
          fallbackModels: this.parseModelList(
            process.env.ASSISTANT_FALLBACK_MODELS ??
              process.env.OPENAI_ASSISTANT_FALLBACK_MODELS,
          ),
        },
      ],
      [
        "groq",
        {
          provider: "groq",
          apiKey: process.env.GROQ_API_KEY,
          baseURL: process.env.GROQ_BASE_URL ?? DEFAULT_GROQ_BASE_URL,
          primaryModel:
            process.env.GROQ_MODEL ??
            process.env.GROQ_ASSISTANT_MODEL ??
            DEFAULT_GROQ_MODEL,
          fallbackModels: this.parseModelList(
            process.env.GROQ_FALLBACK_MODELS ??
              process.env.GROQ_ASSISTANT_FALLBACK_MODELS,
          ),
        },
      ],
    ]);

    return providerOrder.flatMap((provider) => {
      const config = configs.get(provider);
      if (!config) return [];
      const models = [
        config.primaryModel,
        ...config.fallbackModels,
      ].filter((model): model is string => Boolean(model));

      return models.map((model) => ({ config, model }));
    });
  }

  private readProviderOrder(): AssistantProvider[] {
    const parsed = (process.env.ASSISTANT_PROVIDER_ORDER ?? "openai,groq")
      .split(",")
      .map((provider) => provider.trim().toLowerCase())
      .filter((provider): provider is AssistantProvider =>
        provider === "openai" || provider === "groq",
      );

    return parsed.length > 0 ? parsed : ["openai", "groq"];
  }

  private parseModelList(value: string | undefined): string[] {
    return (value ?? "")
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean);
  }

  private readPositiveNumber(key: string, fallback: number): number {
    const value = this.readNumber(key, fallback);
    return value > 0 ? value : fallback;
  }

  private readNumber(key: string, fallback: number): number {
    const parsed = Number(process.env[key]);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private getReasoningEffort(
    provider: AssistantProvider,
    model: string,
  ): ReasoningEffort | null {
    if (provider !== "openai" || !this.isOpenAiReasoningModel(model)) return null;

    const configured = process.env.ASSISTANT_REASONING_EFFORT?.trim().toLowerCase();
    const parsed = REASONING_EFFORTS.has(configured as ReasoningEffort)
      ? (configured as ReasoningEffort)
      : null;

    if (this.supportsNoReasoning(model)) {
      return parsed === "minimal" || parsed === null ? "none" : parsed;
    }

    if (parsed === "none") return "minimal";
    if (parsed) return parsed;

    return "minimal";
  }

  private isOpenAiReasoningModel(model: string): boolean {
    const normalized = model.toLowerCase();
    return (
      normalized.startsWith("gpt-5") ||
      normalized.startsWith("o1") ||
      normalized.startsWith("o3") ||
      normalized.startsWith("o4")
    );
  }

  private supportsNoReasoning(model: string): boolean {
    const normalized = model.toLowerCase();
    const version = normalized.match(/^gpt-5\.(\d+)/);
    if (!version) return false;

    return Number(version[1]) >= 1;
  }

  private getStatus(error: unknown): number | null {
    const shaped = this.toErrorShape(error);
    const status = shaped?.status ?? shaped?.statusCode;
    return typeof status === "number" ? status : null;
  }

  private async waitForRetryAfter(error: unknown): Promise<void> {
    const retryAfterMs = this.getRetryAfterMs(error);
    if (retryAfterMs <= 0 || retryAfterMs > MAX_RETRY_AFTER_MS) return;

    await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
  }

  private getRetryAfterMs(error: unknown): number {
    const shaped = this.toErrorShape(error);
    if (!shaped?.headers) return 0;

    const retryAfter = this.readHeader(shaped.headers, "retry-after");
    if (!retryAfter) return 0;

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1_000;

    const dateMs = Date.parse(retryAfter);
    return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : 0;
  }

  private readHeader(headers: unknown, key: string): string | null {
    if (this.isHeadersLike(headers)) {
      return headers.get(key);
    }

    if (typeof headers !== "object" || headers === null) return null;
    const record = headers as Record<string, unknown>;
    const direct = record[key] ?? record[key.toLowerCase()] ?? record[key.toUpperCase()];
    return typeof direct === "string" ? direct : null;
  }

  private isHeadersLike(value: unknown): value is { get(name: string): string | null } {
    return (
      typeof value === "object" &&
      value !== null &&
      "get" in value &&
      typeof (value as { get?: unknown }).get === "function"
    );
  }

  private toErrorShape(error: unknown): LlmErrorShape | null {
    return typeof error === "object" && error !== null
      ? (error as LlmErrorShape)
      : null;
  }
}
