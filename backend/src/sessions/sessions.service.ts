import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import {
  SessionStatusResponse,
  SessionSummary,
} from './interfaces/session.interface';

const NEXT_STATUS: Partial<Record<SessionStatus, SessionStatus>> = {
  [SessionStatus.SETUP]: SessionStatus.ROUND_1_CONFIG,
  [SessionStatus.ROUND_1_CONFIG]: SessionStatus.ROUND_1,
  [SessionStatus.ROUND_1]: SessionStatus.RECONFIGURATION,
  [SessionStatus.RECONFIGURATION]: SessionStatus.ROUND_2,
  [SessionStatus.ROUND_2]: SessionStatus.ROUND_3,
  [SessionStatus.ROUND_3]: SessionStatus.FINISHED,
};

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.toSummary(updated);
  }

  async getStatus(id: string): Promise<SessionStatusResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        stores: {
          include: {
            members: true,
            plans: {
              where: { confirmed: true },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    return {
      sessionId: session.id,
      status: session.status,
      stores: session.stores.map((store) => ({
        storeId: store.id,
        storeName: store.name,
        memberCount: store.members.length,
        planConfirmed: store.plans.length > 0,
      })),
    };
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
