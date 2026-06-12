import { UserRole, SessionStatus, CategoryName, StoreRole } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { ResultsService } from "../results/results.service";
import { AssistantService } from "./assistant.service";
import { LlmService } from "./llm.service";

type SessionMock = {
  findUnique: jest.Mock;
};

type StoreMock = {
  findUnique: jest.Mock;
};

type PrismaMock = {
  session: SessionMock;
  store: StoreMock;
};

type ResultsMock = {
  getSessionRanking: jest.Mock;
};

type LlmMock = {
  ask: jest.Mock;
};

const user = {
  sub: "player-1",
  email: "player@example.com",
  role: UserRole.PLAYER,
};

const sessionContext = {
  id: "session-1",
  name: "Sessao Teste",
  status: SessionStatus.ROUND_1,
  facilitatorId: "facilitator-1",
  totalDemand: 1000,
  initialCash: 700000,
  cashierSalary: 1000,
  serviceSalary: 1200,
  baseLicenseCost: 1200,
  maintenanceCost: 400,
  stores: [
    {
      id: "store-1",
      name: "Loja A",
      members: [{ userId: "player-1", role: StoreRole.STORE_MANAGER }],
      plans: [
        {
          configVersion: 1,
          cashierOperators: 8,
          serviceOperators: 4,
          confirmed: true,
          categoryDecisions: [
            {
              stockPurchased: 100,
              priceMargin: 0.25,
              category: {
                name: CategoryName.MERCEARIA,
                unitCost: 10,
                taxRate: 0.07,
              },
            },
          ],
          capexDecisions: [
            {
              implemented: true,
              capexOption: {
                name: "Freezer",
                acquisitionCost: 50000,
                monthlyLicenseDelta: 0,
              },
            },
          ],
        },
      ],
      roundResults: [
        {
          round: 1,
          ebitda: 25000,
          ebitdaPercentage: 0.12,
          grossRevenue: 200000,
          netRevenue: 180000,
          demandShare: 0.3,
          csat: 0.72,
          availability: 0.4,
          basketPrice: 12.5,
          payrollCost: 12800,
          maintenanceCost: 0,
          licenseCost: 1200,
          interestCost: 0,
          slaRevenueLost: 0,
          cashUsed: 150000,
        },
      ],
    },
  ],
};

describe("AssistantService", () => {
  let prisma: PrismaMock;
  let resultsService: ResultsMock;
  let llmService: LlmMock;
  let service: AssistantService;

  beforeEach(() => {
    prisma = {
      session: { findUnique: jest.fn() },
      store: { findUnique: jest.fn() },
    };
    resultsService = {
      getSessionRanking: jest.fn().mockResolvedValue([
        {
          rank: 1,
          storeId: "store-1",
          storeName: "Loja A",
          avgEbitdaPercentage: 0.12,
          totalEbitda: 25000,
          rounds: [],
        },
      ]),
    };
    llmService = {
      ask: jest.fn().mockResolvedValue({
        answer: "EBITDA subiu por causa da receita.",
        provider: "openai",
        model: "gpt-4o-mini",
        fallbackUsed: false,
      }),
    };

    service = new AssistantService(
      prisma as unknown as PrismaService,
      resultsService as unknown as ResultsService,
      llmService as unknown as LlmService,
    );
  });

  it("blocks out-of-scope questions without calling the LLM", async () => {
    const response = await service.ask(
      { question: "qual filme eu assisto hoje?" },
      user,
    );

    expect(response).toEqual({
      answer:
        "Posso ajudar apenas com dúvidas sobre o jogo, seus indicadores e as regras da simulação.",
      provider: "none",
      model: null,
      fallbackUsed: false,
    });
    expect(llmService.ask).not.toHaveBeenCalled();
  });

  it("answers general questions about sessions and game flow", async () => {
    await service.ask(
      { question: "Como funcionam as sessões e como funcioina o jogo?" },
      user,
    );

    expect(llmService.ask).toHaveBeenCalledWith({
      systemPrompt: expect.stringContaining(
        "SETUP -> ROUND_1_CONFIG -> ROUND_1 -> RECONFIGURATION -> ROUND_2 -> ROUND_3 -> FINISHED",
      ),
      userQuestion: "Como funcionam as sessões e como funcioina o jogo?",
    });
    expect(llmService.ask.mock.calls[0][0].systemPrompt).toContain(
      "Contexto: pergunta geral sobre as regras do StoreLab.",
    );
  });

  it("accepts plural and unaccented scope terms", async () => {
    await service.ask(
      { question: "Me explique sessoes, rodadas e lojas" },
      user,
    );

    expect(llmService.ask).toHaveBeenCalledWith(
      expect.objectContaining({
        userQuestion: "Me explique sessoes, rodadas e lojas",
      }),
    );
  });

  it("builds a prompt with session context before calling the LLM", async () => {
    prisma.session.findUnique.mockResolvedValue(sessionContext);

    await service.ask(
      {
        sessionId: "session-1",
        storeId: "store-1",
        question: "Por que meu EBITDA melhorou nesta rodada?",
      },
      user,
    );

    expect(llmService.ask).toHaveBeenCalledWith({
      systemPrompt: expect.stringContaining("Loja A"),
      userQuestion: "Por que meu EBITDA melhorou nesta rodada?",
    });
    expect(llmService.ask.mock.calls[0][0].systemPrompt).toContain("PO v1");
    expect(llmService.ask.mock.calls[0][0].systemPrompt).toContain("Ranking atual");
  });

  it("works with sessionId without storeId", async () => {
    prisma.session.findUnique.mockResolvedValue(sessionContext);

    const response = await service.ask(
      {
        sessionId: "session-1",
        question: "Como está o ranking da sessão?",
      },
      user,
    );

    expect(response.answer).toBe("EBITDA subiu por causa da receita.");
    expect(prisma.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "session-1" } }),
    );
  });
});
