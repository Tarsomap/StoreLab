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

const NEXT_STATUS: Partial<Record<SessionStatus, SessionStatus>> = {
  [SessionStatus.SETUP]: SessionStatus.ROUND_1_CONFIG,
  [SessionStatus.ROUND_1_CONFIG]: SessionStatus.ROUND_1,
  [SessionStatus.ROUND_1]: SessionStatus.RECONFIGURATION,
  [SessionStatus.RECONFIGURATION]: SessionStatus.ROUND_2,
  [SessionStatus.ROUND_2]: SessionStatus.ROUND_3,
  [SessionStatus.ROUND_3]: SessionStatus.FINISHED,
};

// Status transitions that correspond to a round becoming active
const ROUND_STARTED_MAP: Partial<Record<SessionStatus, number>> = {
  [SessionStatus.ROUND_1]: 1,
  [SessionStatus.ROUND_2]: 2,
  [SessionStatus.ROUND_3]: 3,
};

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameGateway: GameGateway,
    private readonly resultsService: ResultsService,
  ) {}

  async create(dto: CreateSessionDto, facilitatorId: string): Promise<SessionSummary> {
    const session = await this.prisma.session.create({
      data: {
        name: dto.name,
        facilitatorId,
        totalDemand: dto.totalDemand,
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

  async findById(id: string): Promise<SessionSummary> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return this.toSummary(session);
  }

  async getByFacilitator(facilitatorId: string): Promise<SessionSummary[]> {
    const sessions = await this.prisma.session.findMany({
      where: { facilitatorId },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((s) => this.toSummary(s));
  }

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

    // Emit WebSocket events based on new status
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
