import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus, StoreRole } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { JoinStoreDto } from './dto/join-store.dto';
import { TransferDto } from './dto/transfer.dto';
import {
  StoreMembersResponse,
  StoreSummary,
  TransferResponse,
} from './interfaces/store.interface';

const MAX_STORES_PER_SESSION = 4;
const ALL_STORE_ROLES: StoreRole[] = [
  StoreRole.STORE_MANAGER,
  StoreRole.SUPPLY_MANAGER,
  StoreRole.COMMERCIAL_MANAGER,
  StoreRole.OPERATIONAL_MANAGER,
  StoreRole.SERVICE_MANAGER,
];

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStoreDto): Promise<StoreSummary> {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
      include: { stores: { select: { id: true } } },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.stores.length >= MAX_STORES_PER_SESSION) {
      throw new BadRequestException(
        `Sessão já possui o máximo de ${MAX_STORES_PER_SESSION} lojas`,
      );
    }

    const accessCode = this.generateAccessCode();
    const store = await this.prisma.store.create({
      data: {
        sessionId: dto.sessionId,
        name: dto.name,
        accessCode,
      },
    });

    return this.toSummary(store);
  }

  async join(dto: JoinStoreDto, userId: string): Promise<StoreSummary> {
    const store = await this.prisma.store.findUnique({
      where: { accessCode: dto.accessCode },
      include: { members: true },
    });
    if (!store) throw new NotFoundException('Código de acesso inválido');

    if (store.members.length >= ALL_STORE_ROLES.length) {
      throw new BadRequestException('Loja já está com todos os papéis preenchidos');
    }

    const roleAlreadyTaken = store.members.some((m) => m.role === dto.role);
    if (roleAlreadyTaken) {
      throw new ConflictException(`O papel ${dto.role} já está ocupado nesta loja`);
    }

    const alreadyMember = store.members.some((m) => m.userId === userId);
    if (alreadyMember) {
      throw new ConflictException('Você já é membro desta loja');
    }

    await this.prisma.storeMember.create({
      data: {
        storeId: store.id,
        userId,
        role: dto.role,
      },
    });

    return this.toSummary(store);
  }

  async findById(storeId: string): Promise<StoreSummary> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Loja não encontrada');
    return this.toSummary(store);
  }

  async getMembers(storeId: string): Promise<StoreMembersResponse> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        members: {
          include: { user: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');

    return {
      storeId: store.id,
      storeName: store.name,
      members: store.members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };
  }

  async transfer(sessionId: string, dto: TransferDto): Promise<TransferResponse> {
    // ── 1. Session must be in RECONFIGURATION ───────────────────────────────
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { stores: { select: { id: true } } },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.status !== SessionStatus.RECONFIGURATION) {
      throw new BadRequestException(
        'Transferências só são permitidas durante a RECONFIGURAÇÃO',
      );
    }

    // ── 2. Both stores must belong to this session ──────────────────────────
    const sessionStoreIds = new Set(session.stores.map((s) => s.id));
    if (!sessionStoreIds.has(dto.fromStoreId)) {
      throw new BadRequestException('Loja de origem não pertence a esta sessão');
    }
    if (!sessionStoreIds.has(dto.toStoreId)) {
      throw new BadRequestException('Loja de destino não pertence a esta sessão');
    }
    if (dto.fromStoreId === dto.toStoreId) {
      throw new BadRequestException('Loja de origem e destino devem ser diferentes');
    }

    // ── 3. Player must be a member of fromStore ──────────────────────────────
    const member = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId: dto.fromStoreId, userId: dto.userId } },
    });
    if (!member) {
      throw new NotFoundException('Jogador não encontrado na loja de origem');
    }

    // ── 4. STORE_MANAGER cannot be transferred ───────────────────────────────
    if (member.role === StoreRole.STORE_MANAGER) {
      throw new BadRequestException('O Gerente da Loja não pode ser transferido');
    }

    // ── 5. Max 2 transfers OUT of fromStore in this session ──────────────────
    const outboundCount = await this.prisma.playerTransfer.count({
      where: { sessionId, fromStoreId: dto.fromStoreId },
    });
    if (outboundCount >= 2) {
      throw new BadRequestException(
        'Limite de 2 transferências por loja já foi atingido',
      );
    }

    // ── 6. Role must not already exist in toStore ────────────────────────────
    const roleConflict = await this.prisma.storeMember.findUnique({
      where: { storeId_role: { storeId: dto.toStoreId, role: member.role } },
    });
    if (roleConflict) {
      throw new ConflictException(
        `A loja de destino já possui um membro com o papel ${member.role}`,
      );
    }

    // ── 7. Player must not already be in toStore ─────────────────────────────
    const alreadyInTarget = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId: dto.toStoreId, userId: dto.userId } },
    });
    if (alreadyInTarget) {
      throw new ConflictException('Jogador já é membro da loja de destino');
    }

    // ── 8. Execute in transaction ────────────────────────────────────────────
    const playerTransfer = await this.prisma.$transaction(async (tx) => {
      await tx.storeMember.update({
        where: { id: member.id },
        data: { storeId: dto.toStoreId },
      });

      return tx.playerTransfer.create({
        data: {
          sessionId,
          userId: dto.userId,
          fromStoreId: dto.fromStoreId,
          toStoreId: dto.toStoreId,
          role: member.role,
        },
      });
    });

    return {
      transferId: playerTransfer.id,
      userId: dto.userId,
      fromStoreId: dto.fromStoreId,
      toStoreId: dto.toStoreId,
      role: member.role,
      transferredAt: playerTransfer.transferredAt,
    };
  }

  private generateAccessCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private toSummary(store: {
    id: string;
    sessionId: string;
    name: string;
    accessCode: string;
    createdAt: Date;
  }): StoreSummary {
    return {
      id: store.id,
      sessionId: store.sessionId,
      name: store.name,
      accessCode: store.accessCode,
      createdAt: store.createdAt,
    };
  }
}
