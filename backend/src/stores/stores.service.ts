import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StoreRole } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { JoinStoreDto } from './dto/join-store.dto';
import {
  StoreMembersResponse,
  StoreSummary,
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
