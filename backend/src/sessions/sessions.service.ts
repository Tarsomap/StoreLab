import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SessionStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { GameGateway } from "../gateway/game.gateway";
import { ResultsService } from "../results/results.service";
import { CreateSessionDto } from "./dto/create-session.dto";
import { UpdateSessionDto } from "./dto/update-session.dto";
import {
  SessionCategoryCatalogEntry,
  SessionStatusResponse,
  SessionSummary,
  StockAvailabilityEntry,
} from "./interfaces/session.interface";

const NEXT_STATUS: Partial<Record<SessionStatus, SessionStatus>> = {
  [SessionStatus.SETUP]: SessionStatus.ROUND_1_CONFIG,
  [SessionStatus.ROUND_1_CONFIG]: SessionStatus.ROUND_1,
  [SessionStatus.ROUND_1]: SessionStatus.RECONFIGURATION,
  [SessionStatus.RECONFIGURATION]: SessionStatus.ROUND_2,
  [SessionStatus.ROUND_2]: SessionStatus.ROUND_3,
  [SessionStatus.ROUND_3]: SessionStatus.FINISHED,
};

const ROUND_STARTED_MAP: Partial<Record<SessionStatus, number>> = {
  [SessionStatus.ROUND_1]: 1,
  [SessionStatus.ROUND_2]: 2,
  [SessionStatus.ROUND_3]: 3,
};

const ACTIVE_ROUND_BY_STATUS: Partial<Record<SessionStatus, number>> =
  ROUND_STARTED_MAP;

const PLAYER_ROUND_STATUS_FINISHED = "FINISHED";

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameGateway: GameGateway,
    private readonly resultsService: ResultsService,
  ) {}

  /**
   * Cria uma sessão com os custos operacionais configurados pelo facilitador.
   * cashierSalary, serviceSalary e licenseCostBase são obrigatórios no DTO —
   * o engine os lê diretamente da sessão, eliminando valores hardcoded.
   */
  async create(
    dto: CreateSessionDto,
    facilitatorId: string,
  ): Promise<SessionSummary> {
    if (dto.timerEnabled && dto.timerDuration === undefined) {
      throw new BadRequestException(
        "timerDuration é obrigatório quando timerEnabled está ativo",
      );
    }

    const session = await this.prisma.session.create({
      data: {
        name: dto.name,
        facilitatorId,
        totalDemand: dto.totalDemand,
        initialCash: dto.initialCash ?? 700_000,
        disponibilidade: dto.disponibilidade ?? [],
        // ── Custos operacionais ──────────────────────────────────────────
        cashierSalary: dto.cashierSalary,
        serviceSalary: dto.serviceSalary,
        licenseCostBase: dto.licenseCostBase,
        // ────────────────────────────────────────────────────────────────
        timerEnabled: dto.timerEnabled ?? false,
        timerDuration: dto.timerDuration ?? null,
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

  async findById(id: string): Promise<SessionSummary> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    return this.toSummary(session);
  }

  async getByFacilitator(facilitatorId: string): Promise<SessionSummary[]> {
    const sessions = await this.prisma.session.findMany({
      where: { facilitatorId },
      orderBy: { createdAt: "desc" },
    });
    return sessions.map((s) => this.toSummary(s));
  }

  async advanceStatus(
    id: string,
    facilitatorId: string,
  ): Promise<SessionSummary> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    if (session.facilitatorId !== facilitatorId) {
      throw new ForbiddenException(
        "Apenas o facilitador pode avançar o estado",
      );
    }

    const nextStatus = NEXT_STATUS[session.status];
    if (!nextStatus) {
      throw new BadRequestException("Sessão já está no estado final");
    }

    if (
      session.status === SessionStatus.RECONFIGURATION &&
      nextStatus === SessionStatus.ROUND_2
    ) {
      await this.assertMandatoryTransfers(id);
    }

    const leavingActiveRound = ROUND_STARTED_MAP[session.status] !== undefined;
    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(leavingActiveRound && {
          timerStartedAt: null,
          timerPausedAt: null,
          elapsedBeforePause: 0,
        }),
      },
    });

    const roundStarted = ROUND_STARTED_MAP[nextStatus];
    if (roundStarted !== undefined) {
      this.gameGateway.emitRoundStarted(id, roundStarted);
    }

    if (nextStatus === SessionStatus.FINISHED) {
      const ranking = await this.resultsService.getSessionRanking(id);
      this.gameGateway.emitSessionFinished(id, ranking);
    }

    return this.toSummary(updated);
  }

  async getCategoryCatalog(): Promise<SessionCategoryCatalogEntry[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        stockAvailable: true,
        unitCost: true,
        taxRate: true,
      },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      stockAvailable: category.stockAvailable,
      unitCost: category.unitCost,
      taxRate: category.taxRate,
    }));
  }

  async getStatus(id: string): Promise<SessionStatusResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        stores: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true } } },
            },
            plans: {
              include: {
                categoryDecisions: {
                  include: { category: { select: { unitCost: true } } },
                },
                capexDecisions: {
                  where: { implemented: true },
                  include: {
                    capexOption: { select: { acquisitionCost: true } },
                  },
                },
              },
              orderBy: { configVersion: "desc" },
              take: 1,
            },
            roundResults: {
              orderBy: { round: "desc" },
              take: 1,
              select: { ebitda: true, ebitdaPercentage: true, round: true },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException("Sessão não encontrada");

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
          availableCash: session.initialCash - cashUsed,
          lastRound: lastResult?.round ?? null,
          lastRoundEbitda: lastResult?.ebitda ?? null,
          lastRoundEbitdaPct: lastResult?.ebitdaPercentage ?? null,
        };
      }),
    };
  }

  async getStockAvailability(
    sessionId: string,
    configVersion: number,
  ): Promise<StockAvailabilityEntry[]> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException("Sessão não encontrada");

    const categories = await this.prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    const sessionConfigs = await this.prisma.sessionCategoryConfig.findMany({
      where: { sessionId },
    });
    const configMap = new Map(
      sessionConfigs.map((c) => [c.categoryId, c.stockAvailable]),
    );

    const purchased = await this.prisma.poCategoryDecision.groupBy({
      by: ["categoryId"],
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

    return categories.map((cat, idx) => {
      const arrayVal =
        session.disponibilidade && session.disponibilidade[idx] !== undefined
          ? session.disponibilidade[idx]
          : cat.stockAvailable;

      const totalAvailable = configMap.get(cat.id) ?? arrayVal;
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

  async remove(id: string, userId: string): Promise<{ deleted: true }> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    if (session.facilitatorId !== userId) throw new ForbiddenException();
    if (
      session.status !== SessionStatus.SETUP &&
      session.status !== SessionStatus.FINISHED
    ) {
      throw new BadRequestException(
        "Só é possível excluir sessões em SETUP ou FINISHED. Encerre a partida antes de deletar.",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const planIds = (
        await tx.operationalPlan.findMany({
          where: { store: { sessionId: id } },
          select: { id: true },
        })
      ).map((p) => p.id);

      if (planIds.length) {
        await tx.poCategoryDecision.deleteMany({
          where: { planId: { in: planIds } },
        });
        await tx.poCapexDecision.deleteMany({
          where: { planId: { in: planIds } },
        });
      }

      await tx.operationalPlan.deleteMany({
        where: { store: { sessionId: id } },
      });

      await tx.userQuizAnswer.deleteMany({ where: { sessionId: id } });
      await tx.quizOption.deleteMany({
        where: { question: { sessionId: id } },
      });

      await tx.storeMember.deleteMany({ where: { store: { sessionId: id } } });
      await tx.quizAnswer.deleteMany({ where: { store: { sessionId: id } } });
      await tx.roundResult.deleteMany({ where: { sessionId: id } });
      await tx.slaEvent.deleteMany({ where: { sessionId: id } });
      await tx.playerTransfer.deleteMany({ where: { sessionId: id } });
      await tx.playerRoundStatus.deleteMany({ where: { sessionId: id } });

      await tx.quizQuestion.deleteMany({ where: { sessionId: id } });
      await tx.store.deleteMany({ where: { sessionId: id } });
      await tx.sessionCategoryConfig.deleteMany({ where: { sessionId: id } });

      await tx.session.delete({ where: { id } });
    });

    return { deleted: true };
  }

  async update(
    id: string,
    dto: UpdateSessionDto,
    userId: string,
  ): Promise<SessionSummary> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    if (session.facilitatorId !== userId) throw new ForbiddenException();

    const hasNonNameFields =
      dto.totalDemand !== undefined ||
      dto.initialCash !== undefined ||
      dto.categoryConfigs !== undefined ||
      dto.cashierSalary !== undefined ||
      dto.serviceSalary !== undefined ||
      dto.licenseCostBase !== undefined;

    if (hasNonNameFields && session.status !== SessionStatus.SETUP) {
      throw new BadRequestException(
        "Fora de SETUP, apenas o nome da sessão pode ser editado.",
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.categoryConfigs !== undefined) {
        await tx.sessionCategoryConfig.deleteMany({ where: { sessionId: id } });
        if (dto.categoryConfigs.length > 0) {
          await tx.sessionCategoryConfig.createMany({
            data: dto.categoryConfigs.map((c) => ({
              sessionId: id,
              categoryId: c.categoryId,
              stockAvailable: c.stockAvailable,
            })),
          });
        }
      }

      const timerEnabled = dto.timerEnabled ?? session.timerEnabled;
      const timerDuration = dto.timerDuration ?? session.timerDuration;
      if (timerEnabled && timerDuration === null) {
        throw new BadRequestException(
          "timerDuration é obrigatório quando timerEnabled está ativo",
        );
      }

      return tx.session.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.totalDemand !== undefined && {
            totalDemand: dto.totalDemand,
          }),
          ...(dto.initialCash !== undefined && {
            initialCash: dto.initialCash,
          }),
          // ── Custos operacionais ────────────────────────────────────────
          ...(dto.cashierSalary !== undefined && {
            cashierSalary: dto.cashierSalary,
          }),
          ...(dto.serviceSalary !== undefined && {
            serviceSalary: dto.serviceSalary,
          }),
          ...(dto.licenseCostBase !== undefined && {
            licenseCostBase: dto.licenseCostBase,
          }),
          // ──────────────────────────────────────────────────────────────
          ...(dto.timerEnabled !== undefined && {
            timerEnabled: dto.timerEnabled,
            ...(!dto.timerEnabled && {
              timerStartedAt: null,
              timerPausedAt: null,
              elapsedBeforePause: 0,
            }),
          }),
          ...(dto.timerDuration !== undefined && {
            timerDuration: dto.timerDuration,
          }),
        },
      });
    });

    return this.toSummary(updated);
  }

  /**
   * Normaliza o registro do Prisma para o contrato da API.
   * Inclui os três campos de custo operacional.
   */
  private toSummary(session: {
    id: string;
    name: string;
    status: SessionStatus;
    facilitatorId: string;
    totalDemand: number;
    initialCash: number;
    disponibilidade: number[];
    cashierSalary: number;
    serviceSalary: number;
    licenseCostBase: number;
    timerEnabled: boolean;
    timerDuration: number | null;
    timerStartedAt: Date | null;
    timerPausedAt: Date | null;
    elapsedBeforePause: number;
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
      disponibilidade: session.disponibilidade,
      cashierSalary: session.cashierSalary,
      serviceSalary: session.serviceSalary,
      licenseCostBase: session.licenseCostBase,
      timerEnabled: session.timerEnabled,
      timerDuration: session.timerDuration,
      timerStartedAt: session.timerStartedAt,
      timerPausedAt: session.timerPausedAt,
      elapsedBeforePause: session.elapsedBeforePause,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private async assertMandatoryTransfers(sessionId: string): Promise<void> {
    const stores = await this.prisma.store.findMany({
      where: { sessionId },
      select: { id: true, name: true },
    });
    if (stores.length === 0) {
      throw new BadRequestException("A sessão precisa de lojas para avançar");
    }

    const outboundByStore = await this.prisma.playerTransfer.groupBy({
      by: ["fromStoreId"],
      where: { sessionId },
      _count: { fromStoreId: true },
    });
    const countMap = new Map(
      outboundByStore.map((row) => [row.fromStoreId, row._count.fromStoreId]),
    );

    const pendingStores = stores
      .filter((store) => {
        const count = countMap.get(store.id) ?? 0;
        return count < 1 || count > 2;
      })
      .map((store) => store.name);

    if (pendingStores.length > 0) {
      throw new BadRequestException(
        `Transferências obrigatórias pendentes (1-2 por loja): ${pendingStores.join(", ")}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIMER CONTROL
  // ─────────────────────────────────────────────────────────────────────────────

  async startTimer(id: string, facilitatorId: string): Promise<SessionSummary> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    if (session.facilitatorId !== facilitatorId) {
      throw new ForbiddenException(
        "Apenas o facilitador pode controlar o timer",
      );
    }
    if (!session.timerEnabled || session.timerDuration === null) {
      throw new BadRequestException("O cronômetro não está configurado");
    }
    if (ACTIVE_ROUND_BY_STATUS[session.status] === undefined) {
      throw new BadRequestException(
        "O cronômetro só pode iniciar durante uma rodada ativa",
      );
    }
    if (session.timerStartedAt && !session.timerPausedAt) {
      throw new BadRequestException("O cronômetro já está em execução");
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        timerStartedAt: new Date(),
        timerPausedAt: null,
      },
    });

    this.gameGateway.emitTimerUpdate({
      action: "STARTED",
      sessionId: id,
      timerDuration: updated.timerDuration,
      timerStartedAt: updated.timerStartedAt?.toISOString() ?? null,
      timerPausedAt: updated.timerPausedAt?.toISOString() ?? null,
      elapsedBeforePause: updated.elapsedBeforePause,
      timestamp: new Date().toISOString(),
    });

    return this.toSummary(updated);
  }

  async pauseTimer(id: string, facilitatorId: string): Promise<SessionSummary> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    if (session.facilitatorId !== facilitatorId) {
      throw new ForbiddenException(
        "Apenas o facilitador pode controlar o timer",
      );
    }

    if (!session.timerStartedAt || session.timerPausedAt) {
      throw new BadRequestException("O cronômetro não está rodando ativamente");
    }

    const now = new Date();
    const additionalElapsed = Math.floor(
      (now.getTime() - session.timerStartedAt.getTime()) / 1000,
    );

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        timerPausedAt: now,
        elapsedBeforePause: session.elapsedBeforePause + additionalElapsed,
      },
    });

    this.gameGateway.emitTimerUpdate({
      action: "PAUSED",
      sessionId: id,
      timerDuration: updated.timerDuration,
      timerStartedAt: updated.timerStartedAt?.toISOString() ?? null,
      timerPausedAt: updated.timerPausedAt?.toISOString() ?? null,
      elapsedBeforePause: updated.elapsedBeforePause,
      timestamp: new Date().toISOString(),
    });

    return this.toSummary(updated);
  }

  async stopTimer(id: string, facilitatorId: string): Promise<SessionSummary> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Sessão não encontrada");
    if (session.facilitatorId !== facilitatorId) {
      throw new ForbiddenException(
        "Apenas o facilitador pode controlar o timer",
      );
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        timerStartedAt: null,
        timerPausedAt: null,
        elapsedBeforePause: 0,
      },
    });

    this.gameGateway.emitTimerUpdate({
      action: "STOPPED",
      sessionId: id,
      timerDuration: updated.timerDuration,
      timerStartedAt: updated.timerStartedAt?.toISOString() ?? null,
      timerPausedAt: updated.timerPausedAt?.toISOString() ?? null,
      elapsedBeforePause: updated.elapsedBeforePause,
      timestamp: new Date().toISOString(),
    });

    return this.toSummary(updated);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PLAYER EARLY FINISH
  // ─────────────────────────────────────────────────────────────────────────────

  async setPlayerFinished(
    sessionId: string,
    userId: string,
    round?: number,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException("Sessão não encontrada");

    const activeRound = ACTIVE_ROUND_BY_STATUS[session.status];
    const targetRound = round ?? activeRound;
    if (targetRound === undefined) {
      throw new BadRequestException("A sessão não está em uma rodada ativa");
    }
    if (round !== undefined && round !== activeRound) {
      throw new BadRequestException("A rodada informada não é a rodada ativa");
    }

    await this.assertPlayerBelongsToSession(sessionId, userId);

    const finishedAt = new Date();
    const resolvedRemainingTime = this.calculateRemainingTime(
      session,
      finishedAt,
    );

    const result = await this.prisma.playerRoundStatus.upsert({
      where: {
        sessionId_userId_round: {
          sessionId,
          userId,
          round: targetRound,
        },
      },
      update: {
        status: PLAYER_ROUND_STATUS_FINISHED,
        finishedAt,
        remainingTime: resolvedRemainingTime,
      },
      create: {
        sessionId,
        userId,
        round: targetRound,
        status: PLAYER_ROUND_STATUS_FINISHED,
        finishedAt,
        remainingTime: resolvedRemainingTime,
      },
    });

    return result;
  }

  private calculateRemainingTime(
    session: {
      timerDuration: number | null;
      timerStartedAt: Date | null;
      timerPausedAt: Date | null;
      elapsedBeforePause: number;
    },
    now: Date,
  ): number | null {
    if (session.timerDuration === null) return null;
    const runningElapsed =
      session.timerStartedAt && !session.timerPausedAt
        ? Math.floor((now.getTime() - session.timerStartedAt.getTime()) / 1000)
        : 0;
    return Math.max(
      0,
      session.timerDuration - session.elapsedBeforePause - runningElapsed,
    );
  }

  private async assertPlayerBelongsToSession(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.storeMember.findFirst({
      where: { userId, store: { sessionId } },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException("Jogador não pertence a esta sessão");
    }
  }
}