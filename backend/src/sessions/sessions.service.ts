import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { GameGateway } from '../gateway/game.gateway';
import { ResultsService } from '../results/results.service';
import { CreateSessionDto } from './dto/create-session.dto';
import {
  SessionStatusResponse,
  SessionSummary,
  StockAvailabilityEntry,
} from './interfaces/session.interface';

/**
 * “Próximo passo” da partida: cada chave é o estado atual e o valor é o único estado permitido depois.
 * Funciona como uma fila fixa — o facilitador aperta “avançar” e só anda uma casa; não dá para pular de SETUP direto para RODADA 3,
 * porque o jogo precisa que configure quiz, planos e tempos de cada fase na ordem certa.
 */
const NEXT_STATUS: Partial<Record<SessionStatus, SessionStatus>> = {
  // Da configuração inicial da sessão para a etapa em que se monta a rodada 1 (perguntas, parâmetros, etc.).
  [SessionStatus.SETUP]: SessionStatus.ROUND_1_CONFIG,
  // Config da rodada 1 pronta → rodada 1 “aberta” para os times trabalharem nos planos e no fluxo da fase.
  [SessionStatus.ROUND_1_CONFIG]: SessionStatus.ROUND_1,
  // Rodada 1 em andamento encerrada no fluxo → hora de reconfigurar planos antes da segunda rodada (nova versão de PO).
  [SessionStatus.ROUND_1]: SessionStatus.RECONFIGURATION,
  // Reconfiguração feita → inicia a rodada 2 de fato (competição continua com planos atualizados).
  [SessionStatus.RECONFIGURATION]: SessionStatus.ROUND_2,
  // Rodada 2 → rodada 3 (última rodada de simulação, onde entram regras extras como shrinkage no motor).
  [SessionStatus.ROUND_2]: SessionStatus.ROUND_3,
  // Após a terceira rodada → partida encerrada; daqui não há próximo estado no mapa.
  [SessionStatus.ROUND_3]: SessionStatus.FINISHED,
};

/**
 * Quando o novo estado significa “uma rodada de jogo está valendo agora”, guardamos o número da rodada para avisar o front em tempo real.
 * Só disparamos evento nesses três — estados intermediários (setup, config, reconfig) são preparação, não “rodada ativa” no mesmo sentido.
 */
const ROUND_STARTED_MAP: Partial<Record<SessionStatus, number>> = {
  [SessionStatus.ROUND_1]: 1,
  [SessionStatus.ROUND_2]: 2,
  [SessionStatus.ROUND_3]: 3,
};

/**
 * Regras de negócio das sessões: criar partida, consultar, avançar estado e dados para o facilitador acompanhar lojas e estoque.
 * O estado da sessão é a “bússola” de toda a UI: em cada fase só faz sentido certas telas (PO, quiz, resultados), por isso travamos a ordem.
 */
@Injectable()
export class SessionsService {
  /**
   * Prisma persiste o estado; o gateway avisa jogadores ao mudar rodada ou terminar; resultados montam o ranking final.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameGateway: GameGateway,
    private readonly resultsService: ResultsService,
  ) {}

  /**
   * Cria uma sessão nova já ligada ao facilitador logado e, se vier na requisição, já grava estoques por categoria.
   *
   * @param dto - Nome, demanda, caixa opcional e configs de categoria.
   * @param facilitatorId - Dono da sessão (só ele pode avançar estados depois — evita outro usuário comandar a partida).
   */
  async create(dto: CreateSessionDto, facilitatorId: string): Promise<SessionSummary> {
    const session = await this.prisma.session.create({
      data: {
        name: dto.name,
        facilitatorId,
        totalDemand: dto.totalDemand,
        // Padrão alinhado ao jogo quando o facilitador não manda valor — partidas ficam comparáveis.
        initialCash: dto.initialCash ?? 700_000,
        categoryConfigs: dto.categoryConfigs?.length
          ? {
              create: dto.categoryConfigs.map((c) => ({
                categoryId: c.categoryId,
                stockAvailable: c.stockAvailable,
              })),
            }
          : undefined,
      },
    });

    return this.toSummary(session);
  }

  /**
   * Busca uma sessão pelo id para qualquer usuário autenticado que precise do resumo (detalhe simples).
   *
   * @throws NotFoundException se o id não existir — evita devolver objeto vazio que confundiria o front.
   */
  async findById(id: string): Promise<SessionSummary> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return this.toSummary(session);
  }

  /**
   * Lista todas as sessões criadas por um facilitador, da mais nova para a mais antiga — típico painel “minhas partidas”.
   */
  async getByFacilitator(facilitatorId: string): Promise<SessionSummary[]> {
    const sessions = await this.prisma.session.findMany({
      where: { facilitatorId },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((s) => this.toSummary(s));
  }

  /**
   * Avança exatamente um passo na máquina de estados, só se quem chama for o facilitador dono da sessão.
   *
   * Por que só o facilitador: quem conduz a dinâmica presencial decide “agora fechamos a fase” — se qualquer jogador avançasse,
   * alguém poderia furar o ritmo antes dos outros terminarem o plano ou o quiz. Por que um passo só: garante ordem SETUP → … → FINISHED
   * sem atalhos. Em FINISHED não há próximo estado — devolvemos erro claro em vez de atualizar silenciosamente.
   *
   * Ao entrar em ROUND_1/2/3, avisamos via WebSocket quem está “dentro” da rodada. Ao chegar em FINISHED, calculamos ranking e emitimos
   * para todos verem o resultado final sem precisar recarregar a página.
   *
   * @throws NotFoundException sessão inexistente; ForbiddenException se não for o dono; BadRequestException se já estiver encerrada.
   */
  async advanceStatus(id: string, facilitatorId: string): Promise<SessionSummary> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.facilitatorId !== facilitatorId) {
      throw new ForbiddenException('Apenas o facilitador pode avançar o estado');
    }

    const nextStatus = NEXT_STATUS[session.status];
    if (!nextStatus) {
      throw new BadRequestException('Sessão já está no estado final');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: { status: nextStatus },
    });

    // Aviso em tempo real: jogadores sabem que uma rodada “começou” para sincronizar telas (PO, quiz, etc.).
    const roundStarted = ROUND_STARTED_MAP[nextStatus];
    if (roundStarted !== undefined) {
      this.gameGateway.emitRoundStarted(id, roundStarted);
    }

    if (nextStatus === SessionStatus.FINISHED) {
      // Ranking só faz sentido com todas as rodadas processadas; mandamos junto para a tela de pódio/fechamento.
      const ranking = await this.resultsService.getSessionRanking(id);
      this.gameGateway.emitSessionFinished(id, ranking);
    }

    return this.toSummary(updated);
  }

  /**
   * Painel rico para o facilitador: estado global +, por loja, equipe, se o PO foi confirmado, caixa e último EBITDA.
   *
   * Por que tanto dado numa tacada: na transição de fases o facilitador precisa ver “quem ainda não confirmou” antes de avançar —
   * senão alguém ficaria para trás sem visibilidade. O plano mais recente é o `take: 1` com `orderBy configVersion desc`;
   * só CAPEX implementado entra no caixa usado porque é o que efetivamente consumiu dinheiro naquele plano.
   */
  async getStatus(id: string): Promise<SessionStatusResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        stores: {
          include: {
            members: { include: { user: { select: { id: true, name: true } } } },
            plans: {
              include: {
                categoryDecisions: {
                  include: { category: { select: { unitCost: true } } },
                },
                capexDecisions: {
                  where: { implemented: true },
                  include: { capexOption: { select: { acquisitionCost: true } } },
                },
              },
              orderBy: { configVersion: 'desc' },
              take: 1,
            },
            roundResults: {
              orderBy: { round: 'desc' },
              take: 1,
              select: { ebitda: true, ebitdaPercentage: true, round: true },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    return {
      sessionId: session.id,
      status: session.status,
      stores: session.stores.map((store) => {
        const latestPlan = store.plans[0] ?? null;
        const cashUsed = latestPlan
          ? latestPlan.categoryDecisions.reduce(
              (sum, d) => sum + d.stockPurchased * d.category.unitCost,
              0,
            ) +
            latestPlan.capexDecisions.reduce(
              (sum, d) => sum + d.capexOption.acquisitionCost,
              0,
            )
          : 0;
        const lastResult = store.roundResults[0] ?? null;
        return {
          storeId: store.id,
          storeName: store.name,
          accessCode: store.accessCode,
          memberCount: store.members.length,
          members: store.members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            role: m.role,
          })),
          planConfirmed: latestPlan?.confirmed ?? false,
          cashUsed,
          // Caixa inicial é da sessão — todas as lojas compartilham o mesmo teto conceitual neste resumo.
          availableCash: session.initialCash - cashUsed,
          lastRound: lastResult?.round ?? null,
          lastRoundEbitda: lastResult?.ebitda ?? null,
          lastRoundEbitdaPct: lastResult?.ebitdaPercentage ?? null,
        };
      }),
    };
  }

  /**
   * Mostra, por categoria, quanto a sessão ainda “tem de prateleira compartilhada” após somar compras de todas as lojas naquela versão de plano.
   *
   * Por que filtrar por configVersion: na rodada 2 o jogo usa plano versão 2 — as compras competem pelo estoque naquele recorte,
   * não misturamos com números da versão 1 senão o facilitador veria estoque “fantasma”. Se não houver config na sessão para uma categoria,
   * caímos no stockAvailable padrão do cadastro para não quebrar categorias antigas.
   */
  async getStockAvailability(
    sessionId: string,
    configVersion: number,
  ): Promise<StockAvailabilityEntry[]> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });

    const sessionConfigs = await this.prisma.sessionCategoryConfig.findMany({
      where: { sessionId },
    });
    const configMap = new Map(sessionConfigs.map((c) => [c.categoryId, c.stockAvailable]));

    const purchased = await this.prisma.poCategoryDecision.groupBy({
      by: ['categoryId'],
      where: {
        plan: {
          configVersion,
          store: { sessionId },
        },
      },
      _sum: { stockPurchased: true },
    });
    const purchasedMap = new Map(
      purchased.map((p) => [p.categoryId, p._sum.stockPurchased ?? 0]),
    );

    return categories.map((cat) => {
      const totalAvailable = configMap.get(cat.id) ?? cat.stockAvailable;
      const totalPurchased = purchasedMap.get(cat.id) ?? 0;
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        totalAvailable,
        totalPurchased,
        remaining: totalAvailable - totalPurchased,
      };
    });
  }

  /**
   * Normaliza o registro do Prisma para o contrato da API (datas e campos estáveis para o front).
   */
  private toSummary(session: {
    id: string;
    name: string;
    status: SessionStatus;
    facilitatorId: string;
    totalDemand: number;
    initialCash: number;
    createdAt: Date;
    updatedAt: Date;
  }): SessionSummary {
    return {
      id: session.id,
      name: session.name,
      status: session.status,
      facilitatorId: session.facilitatorId,
      totalDemand: session.totalDemand,
      initialCash: session.initialCash,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
