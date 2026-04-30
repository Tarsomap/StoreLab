import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  TWO_FA_ENABLED: 'TWO_FA_ENABLED',
  TWO_FA_DISABLED: 'TWO_FA_DISABLED',
  TWO_FA_VERIFIED: 'TWO_FA_VERIFIED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: AuditAction,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async findAll(sessionId?: string, storeId?: string) {
    let userIdFilter: string[] | undefined;

    if (storeId) {
      const members = await this.prisma.storeMember.findMany({
        where: { storeId },
        select: { userId: true },
      });
      userIdFilter = members.map((m) => m.userId);
    } else if (sessionId) {
      const members = await this.prisma.storeMember.findMany({
        where: { store: { sessionId } },
        select: { userId: true },
      });
      userIdFilter = members.map((m) => m.userId);
    }

    return this.prisma.auditLog.findMany({
      where: userIdFilter !== undefined ? { userId: { in: userIdFilter } } : {},
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
