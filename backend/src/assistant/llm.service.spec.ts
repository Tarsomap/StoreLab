import { ServiceUnavailableException } from "@nestjs/common";
import { LlmService } from "./llm.service";

type MockResponse = {
  choices: {
    message?: {
      content?: string | null;
    };
  }[];
};

type MockClient = {
  chat: {
    completions: {
      create: jest.Mock<Promise<MockResponse>, [unknown]>;
    };
  };
};

class TestLlmService extends LlmService {
  readonly clientParams: { apiKey: string; baseURL?: string }[] = [];

  constructor(private readonly clients: MockClient[]) {
    super();
  }

  protected createClient(params: { apiKey: string; baseURL?: string }) {
    this.clientParams.push(params);
    const client = this.clients.shift();
    if (!client) throw new Error("Missing mock client");
    return client;
  }
}

function makeClient(
  create: jest.Mock<Promise<MockResponse>, [unknown]>,
): MockClient {
  return {
    chat: {
      completions: {
        create,
      },
    },
  };
}

describe("LlmService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.useRealTimers();
    process.env = {
      ...originalEnv,
      ASSISTANT_PROVIDER_ORDER: "openai,groq",
      ASSISTANT_MAX_TOKENS: "420",
      ASSISTANT_TEMPERATURE: "0.2",
      ASSISTANT_REASONING_EFFORT: "minimal",
      OPENAI_API_KEY: "openai-key",
      ASSISTANT_MODEL: "gpt-4o-mini",
      ASSISTANT_FALLBACK_MODELS:
        "gpt-4.1-mini,gpt-5-mini,gpt-5.4-mini,gpt-5.4-nano,gpt-4.1-nano,gpt-4o",
      OPENAI_ASSISTANT_MODEL: undefined,
      OPENAI_ASSISTANT_FALLBACK_MODELS: undefined,
      GROQ_API_KEY: "groq-key",
      GROQ_MODEL: "llama-3.1-8b-instant",
      GROQ_FALLBACK_MODELS:
        "meta-llama/llama-4-scout-17b-16e-instruct,llama-3.3-70b-versatile,qwen/qwen3-32b,openai/gpt-oss-20b,openai/gpt-oss-120b,groq/compound-mini",
      GROQ_ASSISTANT_MODEL: undefined,
      GROQ_ASSISTANT_FALLBACK_MODELS: undefined,
      GROQ_BASE_URL: "https://api.groq.com/openai/v1",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it("uses OpenAI when the primary model succeeds", async () => {
    const openaiCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "Resposta OpenAI" } }],
    });
    const service = new TestLlmService([makeClient(openaiCreate)]);

    const result = await service.ask({
      systemPrompt: "sistema",
      userQuestion: "explique ebitda",
    });

    expect(result).toEqual({
      answer: "Resposta OpenAI",
      provider: "openai",
      model: "gpt-4o-mini",
      fallbackUsed: false,
    });
    expect(openaiCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4o-mini" }),
    );
  });

  it("falls back to the OpenAI fallback model on 429", async () => {
    const primaryCreate = jest.fn().mockRejectedValue({ status: 429 });
    const fallbackCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "Fallback OpenAI" } }],
    });
    const service = new TestLlmService([
      makeClient(primaryCreate),
      makeClient(fallbackCreate),
    ]);

    const result = await service.ask({
      systemPrompt: "sistema",
      userQuestion: "explique csat",
    });

    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4.1-mini");
    expect(result.fallbackUsed).toBe(true);
    expect(fallbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4.1-mini" }),
    );
  });

  it("keeps using OpenAI fallback models from ASSISTANT_FALLBACK_MODELS in order", async () => {
    const primaryCreate = jest.fn().mockRejectedValue({ status: 429 });
    const fallbackOneCreate = jest.fn().mockRejectedValue({ status: 429 });
    const fallbackTwoCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "Fallback GPT-5" } }],
    });
    const service = new TestLlmService([
      makeClient(primaryCreate),
      makeClient(fallbackOneCreate),
      makeClient(fallbackTwoCreate),
    ]);

    const result = await service.ask({
      systemPrompt: "sistema",
      userQuestion: "explique csat",
    });

    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-5-mini");
    expect(result.fallbackUsed).toBe(true);
    expect(fallbackTwoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5-mini",
        reasoning_effort: "minimal",
      }),
    );
  });

  it("does not send reasoning effort to non-reasoning OpenAI models", async () => {
    const openaiCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "Resposta rapida" } }],
    });
    const service = new TestLlmService([makeClient(openaiCreate)]);

    await service.ask({
      systemPrompt: "sistema",
      userQuestion: "explique ebitda",
    });

    expect(openaiCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ reasoning_effort: expect.any(String) }),
    );
  });

  it("uses no reasoning for GPT-5.1+ models when minimal is configured", async () => {
    process.env.ASSISTANT_MODEL = "gpt-5.4-mini";
    const openaiCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "Resposta sem raciocinio" } }],
    });
    const service = new TestLlmService([makeClient(openaiCreate)]);

    await service.ask({
      systemPrompt: "sistema",
      userQuestion: "explique o jogo",
    });

    expect(openaiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.4-mini",
        reasoning_effort: "none",
      }),
    );
  });

  it("falls back to Groq when OpenAI models fail temporarily", async () => {
    process.env.ASSISTANT_FALLBACK_MODELS = "gpt-4.1-mini";
    process.env.GROQ_FALLBACK_MODELS = "";
    const primaryCreate = jest.fn().mockRejectedValue({ status: 503 });
    const openaiFallbackCreate = jest.fn().mockRejectedValue({ status: 500 });
    const groqCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "Resposta Groq" } }],
    });
    const service = new TestLlmService([
      makeClient(primaryCreate),
      makeClient(openaiFallbackCreate),
      makeClient(groqCreate),
    ]);

    const result = await service.ask({
      systemPrompt: "sistema",
      userQuestion: "explique capex",
    });

    expect(result).toEqual({
      answer: "Resposta Groq",
      provider: "groq",
      model: "llama-3.1-8b-instant",
      fallbackUsed: true,
    });
    expect(service.clientParams[2]).toEqual({
      apiKey: "groq-key",
      baseURL: "https://api.groq.com/openai/v1",
    });
  });

  it("skips OpenAI models when the OpenAI key is missing and uses Groq", async () => {
    process.env.OPENAI_API_KEY = "";
    process.env.ASSISTANT_FALLBACK_MODELS = "gpt-4.1-mini";
    process.env.GROQ_FALLBACK_MODELS = "";
    const groqCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "Resposta Groq sem OpenAI" } }],
    });
    const service = new TestLlmService([makeClient(groqCreate)]);

    const result = await service.ask({
      systemPrompt: "sistema",
      userQuestion: "explique ebitda",
    });

    expect(result).toEqual({
      answer: "Resposta Groq sem OpenAI",
      provider: "groq",
      model: "llama-3.1-8b-instant",
      fallbackUsed: true,
    });
    expect(groqCreate).toHaveBeenCalledTimes(1);
  });

  it("does not fallback on authentication errors", async () => {
    const primaryCreate = jest.fn().mockRejectedValue({ status: 401 });
    const fallbackCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "nao deve chamar" } }],
    });
    const service = new TestLlmService([
      makeClient(primaryCreate),
      makeClient(fallbackCreate),
    ]);

    await expect(
      service.ask({
        systemPrompt: "sistema",
        userQuestion: "explique ebitda",
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fallbackCreate).not.toHaveBeenCalled();
  });

  it("returns ServiceUnavailableException when every provider fails", async () => {
    process.env.ASSISTANT_FALLBACK_MODELS = "";
    process.env.GROQ_FALLBACK_MODELS = "";
    const openaiCreate = jest.fn().mockRejectedValue({ status: 429 });
    const groqCreate = jest.fn().mockRejectedValue({ status: 503 });
    const service = new TestLlmService([
      makeClient(openaiCreate),
      makeClient(groqCreate),
    ]);

    await expect(
      service.ask({
        systemPrompt: "sistema",
        userQuestion: "explique ranking",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
