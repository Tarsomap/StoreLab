import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { ResultsService } from "../results/results.service";
import { AskAssistantDto } from "./dto/ask-assistant.dto";
import { AssistantAskResponse } from "./interfaces/assistant.interface";
import { LlmService } from "./llm.service";

type CurrentUser = {
  sub: string;
  email: string;
  role: UserRole;
};

const OUT_OF_SCOPE_ANSWER =
  "Posso ajudar apenas com dúvidas sobre o jogo, seus indicadores e as regras da simulação.";

const ALLOWED_TERMS = [
  "aging",
  "abastecimento",
  "capex",
  "caixa",
  "categoria",
  "categorias",
  "comercial",
  "configuração",
  "configuracao",
  "csat",
  "demanda",
  "dre",
  "ebitda",
  "estoque",
  "facilitador",
  "funciona",
  "funcionam",
  "funcionamento",
  "gerente",
  "gerentes",
  "imposto",
  "impostos",
  "indicador",
  "indicadores",
  "jogador",
  "jogadores",
  "jogo",
  "juros",
  "licença",
  "licenca",
  "lojas",
  "loja",
  "manutenção",
  "manutencao",
  "margem",
  "operador",
  "operadores",
  "partida",
  "plano",
  "po",
  "preço",
  "preco",
  "quiz",
  "ranking",
  "reconfiguração",
  "reconfiguracao",
  "resultado",
  "resultados",
  "rodada",
  "rodadas",
  "salário",
  "salario",
  "sessao",
  "sessão",
  "sessoes",
  "sessões",
  "shrinkage",
  "simulacao",
  "simulação",
  "sla",
  "transferência",
  "transferencia",
  "varejo",
];

const GAME_RULES_PROMPT = [
  "BLOCO DE REGRAS DO JOGO:",
  "- O StoreLab é uma simulação de gestão de loja de varejo. Quatro lojas competem em três rodadas.",
  "- Cada loja tem cinco jogadores com papéis fixos: Gerente da Loja, Gerente de Serviços, Gerente de Abastecimento, Gerente Comercial e Gerente Operacional.",
  "- O facilitador cria a sessão, configura parâmetros, cria lojas, acompanha confirmações, inicia rodadas e exibe resultados.",
  "- O fluxo da sessão é: SETUP -> ROUND_1_CONFIG -> ROUND_1 -> RECONFIGURATION -> ROUND_2 -> ROUND_3 -> FINISHED.",
  "- Em SETUP, jogadores entram nas lojas por código e assumem papéis. Na configuração, a loja preenche o Plano Operacional (PO).",
  "- O PO reúne decisões de estoque por categoria, margem/preço, operadores de caixa, operadores de serviço e CAPEX.",
  "- O Gerente da Loja confirma o PO final. O facilitador só deve avançar quando as lojas necessárias estiverem prontas.",
  "- A cada rodada, o motor do jogo usa os dados já gravados para gerar SLA, CSAT, distribuição de demanda, receitas, custos e EBITDA.",
  "- A rodada 1 gera resultados parciais. Depois dela há reconfiguração, com transferência obrigatória de 1 a 2 jogadores por loja. O Gerente da Loja não pode ser transferido.",
  "- Na reconfiguração, a loja pode ajustar margem, operadores e certas decisões dentro das restrições de caixa. Não pode usar receita de vendas para repor caixa.",
  "- O ranking considera desempenho financeiro consolidado, principalmente %EBITDA acumulado ao longo das rodadas.",
  "- CSAT representa satisfação do cliente e depende de operadores de caixa e desempenho no quiz.",
  "- Demanda é distribuída entre lojas por preço da cesta, disponibilidade e CSAT. Menor preço é melhor; maior disponibilidade e maior CSAT são melhores.",
  "- CAPEX pode reduzir risco, impacto operacional, manutenção ou licenças conforme a opção escolhida.",
  "- Quebras e aging entram apenas na rodada 3, sobre estoque acumulado não vendido.",
  "- EBITDA é resultado operacional: receita líquida menos custos e perdas registrados pelo motor. A IA pode explicar o conceito, mas não recalcula nem inventa valores.",
].join("\n");

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resultsService: ResultsService,
    private readonly llmService: LlmService,
  ) {}

  async ask(
    dto: AskAssistantDto,
    user: CurrentUser,
  ): Promise<AssistantAskResponse> {
    const question = dto.question.trim();
    if (this.isClearlyOutOfScope(question)) {
      return {
        answer: OUT_OF_SCOPE_ANSWER,
        provider: "none",
        model: null,
        fallbackUsed: false,
      };
    }

    const context = await this.buildContext(dto, user);
    const response = await this.llmService.ask({
      systemPrompt: this.buildSystemPrompt(context),
      userQuestion: question,
    });

    return response;
  }

  private isClearlyOutOfScope(question: string): boolean {
    const normalized = this.normalizeForScope(question);
    return !ALLOWED_TERMS.some((term) =>
      normalized.includes(this.normalizeForScope(term)),
    );
  }

  private normalizeForScope(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  private async buildContext(
    dto: Pick<AskAssistantDto, "sessionId" | "storeId">,
    user: CurrentUser,
  ): Promise<string> {
    if (!dto.sessionId && !dto.storeId) {
      return "Contexto: pergunta geral sobre as regras do StoreLab.";
    }

    const sessionId = dto.sessionId ?? (await this.findSessionIdByStore(dto.storeId));
    if (!sessionId) {
      return "Contexto: pergunta geral sobre as regras do StoreLab.";
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        name: true,
        status: true,
        facilitatorId: true,
        totalDemand: true,
        initialCash: true,
        cashierSalary: true,
        serviceSalary: true,
        baseLicenseCost: true,
        maintenanceCost: true,
        stores: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
            plans: {
              orderBy: { configVersion: "desc" },
              take: 1,
              select: {
                configVersion: true,
                cashierOperators: true,
                serviceOperators: true,
                confirmed: true,
                categoryDecisions: {
                  select: {
                    stockPurchased: true,
                    priceMargin: true,
                    category: {
                      select: { name: true, unitCost: true, taxRate: true },
                    },
                  },
                },
                capexDecisions: {
                  select: {
                    implemented: true,
                    capexOption: {
                      select: {
                        name: true,
                        acquisitionCost: true,
                        monthlyLicenseDelta: true,
                      },
                    },
                  },
                },
              },
            },
            roundResults: {
              orderBy: { round: "desc" },
              take: 3,
              select: {
                round: true,
                ebitda: true,
                ebitdaPercentage: true,
                grossRevenue: true,
                netRevenue: true,
                demandShare: true,
                csat: true,
                availability: true,
                basketPrice: true,
                payrollCost: true,
                maintenanceCost: true,
                licenseCost: true,
                interestCost: true,
                slaRevenueLost: true,
                cashUsed: true,
              },
            },
          },
        },
      },
    });

    if (!session) throw new NotFoundException("Sessão não encontrada");
    this.assertUserCanReadSession(session, user);

    const selectedStore = dto.storeId
      ? session.stores.find((store) => store.id === dto.storeId)
      : null;
    if (dto.storeId && !selectedStore) {
      throw new NotFoundException("Loja não encontrada nesta sessão");
    }

    if (
      selectedStore &&
      user.role === UserRole.PLAYER &&
      !selectedStore.members.some((member) => member.userId === user.sub)
    ) {
      throw new ForbiddenException("Jogador não pertence a esta loja");
    }

    const ranking = await this.resultsService.getSessionRanking(session.id);
    const lines = [
      `Sessão: ${session.name} (${session.status})`,
      `Demanda total: ${session.totalDemand}`,
      `Caixa inicial por loja: R$ ${session.initialCash}`,
      `Custos configurados: caixa R$ ${session.cashierSalary}, serviço R$ ${session.serviceSalary}, licença base R$ ${session.baseLicenseCost}, manutenção R$ ${session.maintenanceCost}`,
      `Lojas na sessão: ${session.stores.map((store) => store.name).join(", ") || "nenhuma"}`,
      ranking.length > 0
        ? `Ranking atual: ${ranking
            .map(
              (entry) =>
                `${entry.rank}. ${entry.storeName} EBITDA total R$ ${Math.round(entry.totalEbitda)} (${(entry.avgEbitdaPercentage * 100).toFixed(1)}% médio)`,
            )
            .join("; ")}`
        : "Ranking atual: ainda sem resultados consolidados.",
    ];

    const storesForContext = selectedStore ? [selectedStore] : session.stores;
    for (const store of storesForContext) {
      const plan = store.plans[0];
      lines.push(`Loja ${store.name}: ${store.members.length} membros.`);
      if (plan) {
        lines.push(
          `PO v${plan.configVersion}: confirmado=${plan.confirmed}, operadores caixa=${plan.cashierOperators}, operadores serviço=${plan.serviceOperators}.`,
        );
        lines.push(
          `Categorias: ${plan.categoryDecisions
            .map(
              (decision) =>
                `${decision.category.name} estoque=${decision.stockPurchased}, margem=${(decision.priceMargin * 100).toFixed(1)}%, custo unitário R$ ${decision.category.unitCost}, imposto=${(decision.category.taxRate * 100).toFixed(1)}%`,
            )
            .join("; ") || "sem decisões"}.`,
        );
        lines.push(
          `CAPEX implementados: ${plan.capexDecisions
            .filter((decision) => decision.implemented)
            .map(
              (decision) =>
                `${decision.capexOption.name} (R$ ${decision.capexOption.acquisitionCost}, licença +R$ ${decision.capexOption.monthlyLicenseDelta})`,
            )
            .join("; ") || "nenhum"}.`,
        );
      }

      if (store.roundResults.length > 0) {
        lines.push(
          `Resultados recentes ${store.name}: ${store.roundResults
            .map(
              (result) =>
                `R${result.round} EBITDA R$ ${Math.round(result.ebitda)} (${(result.ebitdaPercentage * 100).toFixed(1)}%), receita bruta R$ ${Math.round(result.grossRevenue)}, demanda ${(result.demandShare * 100).toFixed(1)}%, CSAT ${(result.csat * 100).toFixed(1)}%, disponibilidade ${(result.availability * 100).toFixed(1)}%, preço cesta R$ ${Math.round(result.basketPrice)}, folha R$ ${Math.round(result.payrollCost)}, manutenção R$ ${Math.round(result.maintenanceCost)}, licença R$ ${Math.round(result.licenseCost)}, juros R$ ${Math.round(result.interestCost)}, SLA perdido R$ ${Math.round(result.slaRevenueLost)}, caixa usado R$ ${Math.round(result.cashUsed)}`,
            )
            .join("; ")}`,
        );
      }
    }

    return lines.join("\n");
  }

  private async findSessionIdByStore(
    storeId: string | undefined,
  ): Promise<string | null> {
    if (!storeId) return null;
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { sessionId: true },
    });
    if (!store) throw new NotFoundException("Loja não encontrada");
    return store.sessionId;
  }

  private assertUserCanReadSession(
    session: {
      facilitatorId: string;
      stores: { members: { userId: string }[] }[];
    },
    user: CurrentUser,
  ): void {
    if (session.facilitatorId === user.sub) return;
    const isMember = session.stores.some((store) =>
      store.members.some((member) => member.userId === user.sub),
    );
    if (isMember) return;

    throw new ForbiddenException("Usuário não pertence a esta sessão");
  }

  private buildSystemPrompt(context: string): string {
    return [
      "Você é o assistente do StoreLab, uma simulação gamificada de gestão de varejo.",
      "Responda em português do Brasil, com tom objetivo, didático e prático.",
      "Use apenas o contexto fornecido e as regras do jogo abaixo. Se faltar dado, diga o que falta em vez de inventar.",
      "Ajude o usuário a entender indicadores, decisões de PO, EBITDA, CSAT, CAPEX, demanda, caixa, ranking e custos.",
      "Você também pode explicar como funcionam sessões, rodadas, papéis dos jogadores, fluxo do jogo e responsabilidades do facilitador.",
      "Não dê conselhos fora do jogo, não exponha segredos técnicos e não peça chaves de API.",
      "Não recalcule EBITDA, CSAT, demanda, impostos ou qualquer indicador. Use números somente quando eles estiverem no contexto.",
      "Quando a pergunta for geral sobre o funcionamento do jogo, responda com uma visão organizada em passos curtos.",
      "",
      GAME_RULES_PROMPT,
      "",
      "CONTEXTO ATUAL:",
      context,
    ].join("\n");
  }
}
