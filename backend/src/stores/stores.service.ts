import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus, StoreRole } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { JoinStoreDto } from './dto/join-store.dto';
import { SwapDto } from './dto/swap.dto';
import { TransferDto } from './dto/transfer.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import {
  StoreMembersResponse,
  StoreSummary,
  SwapResponse,
  TransferResponse,
  TransferSessionSummary,
  UserStoreEntry,
} from './interfaces/store.interface';

/**
 * Teto de lojas por partida — o jogo foi desenhado para até quatro equipes competindo lado a lado.
 * Impedir a quinta loja evita diluir demais a demanda e manter o tabuleiro gerenciável para o facilitador.
 */
const MAX_STORES_PER_SESSION = 4;

/**
 * Lista de todos os papéis distintos que uma loja pode ter; o tamanho do array é o tamanho máximo do time (5 pessoas).
 * Usamos isso no join para não aceitar um sexto membro “sem papel” ou com papel duplicado fora da regra.
 */
const ALL_STORE_ROLES: StoreRole[] = [
  StoreRole.STORE_MANAGER,
  StoreRole.SUPPLY_MANAGER,
  StoreRole.COMMERCIAL_MANAGER,
  StoreRole.OPERATIONAL_MANAGER,
  StoreRole.SERVICE_MANAGER,
];

/**
 * Regras de lojas no StoreLab: criar unidade na sessão, montar equipe por código e realocar jogadores entre lojas na reconfiguração.
 * A “transferência” aqui move **pessoas** (papéis) de uma loja para outra na mesma partida — como quando a rede realoca um gestor
 * ou especialista de uma filial para outra após uma temporada, equilibrando força de trabalho antes da próxima rodada de decisões.
 */
@Injectable()
export class StoresService {
  /**
   * Única dependência é o acesso ao banco — todas as regras de loja, membro e transferência passam pelo Prisma.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Abre uma nova loja na sessão com código de acesso aleatório para o time convidar jogadores.
   *
   * Por que limitar a 4: a dinâmica e o motor assumem no máximo quatro competidores; passar disso quebraria o desenho da sala.
   *
   * @throws NotFoundException se a sessão não existir; BadRequestException se já houver 4 lojas.
   */
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

  /**
   * Vincula o usuário logado a uma loja existente, desde que o código seja válido e o papel esteja livre.
   *
   * Idempotência: se o jogador já está naquela loja, devolvemos a loja de novo — assim o app pode chamar “join” ao reabrir
   * sem tomar erro de duplicidade. Dois jogadores no mesmo papel são proibidos porque cada função (suprimentos, serviço…) é única no time.
   * Limite de 5 membros = um por papel; lotamos a “mesa redonda” do planejamento colaborativo do PO.
   *
   * @throws NotFoundException código inválido; ConflictException papel ocupado ou já membro do destino em fluxos inconsistentes;
   *         BadRequestException loja cheia.
   */
  async join(dto: JoinStoreDto, userId: string): Promise<StoreSummary> {
    const store = await this.prisma.store.findUnique({
      where: { accessCode: dto.accessCode },
      include: { members: true },
    });
    if (!store) throw new NotFoundException('Código de acesso inválido');

    // Se o jogador já entrou antes, não criamos outra linha — evita erro ao atualizar página ou reentrar pelo mesmo código.
    const alreadyMember = store.members.find((m) => m.userId === userId);
    if (alreadyMember) {
      return this.toSummary(store);
    }

    // Cada cadeira é única: dois “gerentes comerciais” confundiria quem responde pelo que no plano operacional.
    const roleAlreadyTaken = store.members.some((m) => m.role === dto.role);
    if (roleAlreadyTaken) {
      throw new ConflictException(`O papel ${dto.role} já está ocupado nesta loja`);
    }

    if (store.members.length >= ALL_STORE_ROLES.length) {
      throw new BadRequestException('Loja já está com todos os papéis preenchidos');
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

  /**
   * Lista todas as lojas em que o usuário tem personagem — ordenado pela data de entrada para manter hábito previsível na UI.
   */
  async findMine(userId: string): Promise<UserStoreEntry[]> {
    const memberships = await this.prisma.storeMember.findMany({
      where: { userId },
      include: {
        store: { select: { id: true, name: true, sessionId: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      storeId: m.store.id,
      storeName: m.store.name,
      sessionId: m.store.sessionId,
      role: m.role,
    }));
  }

  /**
   * Busca uma loja pelo id (resumo com código de acesso).
   */
  async findById(storeId: string): Promise<StoreSummary> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Loja não encontrada');
    return this.toSummary(store);
  }

  /**
   * Retorna a equipe completa com e-mail e data de filiação — o facilitador e o time veem quem falta para fechar os cinco papéis.
   */
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

  /**
   * Move um jogador da loja A para a loja B dentro da mesma sessão, **somente** durante RECONFIGURATION.
   *
   * No jogo, depois de uma rodada o facilitador pode “rebalancear equipes” entre unidades — como transferir um analista de uma filial
   * para outra antes do próximo ciclo de metas. Isso não altera produtos nem estoque no código: altera **quem** está em qual loja,
   * mantendo o papel profissional (exceto o Gerente da Loja, que permanece âncora da unidade).
   *
   * Validações em ordem:
   * - Só na reconfiguração: fora dessa janela, mudar time bagunçaria PO/quiz alinhados ao estado da sessão.
   * - Origem e destino na mesma sessão: impede cruzar partidas acidentalmente.
   * - Origem ≠ destino: não há “transferência” para a mesma loja.
   * - Jogador tem de estar na origem: não dá para mover quem não faz parte da equipe de saída.
   * - Gerente da loja não sai: é o pivô da narrativa daquela unidade; trocá-lo quebraria a continuidade da “casa”.
   * - No máximo 2 saídas por loja de origem na sessão: regra de desafio do StoreLab (1–2 jogadores por loja), para forçar decisão de RH, não turismo infinito.
   * - Papel livre no destino: não podemos ter dois com o mesmo cargo na loja de chegada.
   * - Jogador ainda não pode já ser membro do destino: evita duplicidade de vínculo.
   *
   * A transação garante que atualizar membro e criar registro histórico de transferência aconteçam juntos ou nada grava — evita jogador “sumido” ou histórico mentiroso.
   */
  async transfer(sessionId: string, dto: TransferDto): Promise<TransferResponse> {
    // ── 1. Sessão deve estar em RECONFIGURATION ───────────────────────────────
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

    // ── 2. Ambas as lojas precisam ser da mesma sessão informada na URL ────────
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

    // ── 3. Quem será movido precisa estar na loja de origem ───────────────────
    const member = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId: dto.fromStoreId, userId: dto.userId } },
    });
    if (!member) {
      throw new NotFoundException('Jogador não encontrado na loja de origem');
    }

    // ── 4. Gerente da loja não pode ser transferido ─────────────────────────────
    if (member.role === StoreRole.STORE_MANAGER) {
      throw new BadRequestException('O Gerente da Loja não pode ser transferido');
    }

    // ── 5. No máximo 2 transferências de saída por loja nesta sessão ──────────
    const outboundCount = await this.prisma.playerTransfer.count({
      where: { sessionId, fromStoreId: dto.fromStoreId },
    });
    if (outboundCount >= 2) {
      throw new BadRequestException(
        'Limite de 2 transferências por loja já foi atingido',
      );
    }

    // ── 6. Destino não pode já ter alguém no mesmo papel ───────────────────────
    const roleConflict = await this.prisma.storeMember.findUnique({
      where: { storeId_role: { storeId: dto.toStoreId, role: member.role } },
    });
    if (roleConflict) {
      throw new ConflictException(
        `A loja de destino já possui um membro com o papel ${member.role}`,
      );
    }

    // ── 7. Jogador não pode já estar no destino (dupla filiação) ───────────────
    const alreadyInTarget = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId: dto.toStoreId, userId: dto.userId } },
    });
    if (alreadyInTarget) {
      throw new ConflictException('Jogador já é membro da loja de destino');
    }

    // ── 8. Atualização do vínculo + auditoria da movimentação no mesmo passo atômico ──
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

  /**
   * Troca recíproca de dois jogadores de **mesmo papel** entre duas lojas da sessão, somente em RECONFIGURATION.
   *
   * Por que existe separado do transfer(): quando as duas lojas estão cheias (cinco papéis), mover um único jogador
   * falha porque o papel já está ocupado no destino — um impasse de troca. O swap move os dois ao mesmo tempo,
   * de forma atômica, sem nunca relaxar o invariante de papel único por loja (por isso exige papéis iguais).
   *
   * Validações (em ordem), todas antes de gravar:
   * - Jogadores distintos.
   * - Sessão em RECONFIGURATION (mesma janela do transfer).
   * - Ambos são membros de alguma loja DESTA sessão.
   * - Estão em lojas DIFERENTES.
   * - Nenhum é Gerente da Loja (âncora intransferível da unidade).
   * - Têm o MESMO papel — caso contrário a troca quebraria a unicidade de papel por loja.
   * - Cada loja envolvida ainda tem espaço na regra de “máx 2 saídas por loja na sessão” (o swap conta 1 saída para cada).
   *
   * Execução: a constraint @@unique([storeId, role]) é imediata, então não dá para mover por `update` sem colidir
   * com o slot ocupado do outro lado. A transação libera os dois slots (delete) e recria os vínculos já trocados,
   * preservando `joinedAt`. Em seguida grava dois PlayerTransfer (um por sentido) para a contagem de saídas continuar correta.
   */
  async swap(sessionId: string, dto: SwapDto): Promise<SwapResponse> {
    // ── 0. Não faz sentido trocar um jogador por ele mesmo ────────────────────
    if (dto.userAId === dto.userBId) {
      throw new BadRequestException('Os dois jogadores da troca devem ser diferentes');
    }

    // ── 1. Sessão deve estar em RECONFIGURATION ───────────────────────────────
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { stores: { select: { id: true } } },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.status !== SessionStatus.RECONFIGURATION) {
      throw new BadRequestException(
        'Trocas só são permitidas durante a RECONFIGURAÇÃO',
      );
    }
    const sessionStoreIds = session.stores.map((s) => s.id);

    // ── 2. Os dois precisam ser membros de alguma loja desta sessão ───────────
    const [memberA, memberB] = await Promise.all([
      this.prisma.storeMember.findFirst({
        where: { userId: dto.userAId, storeId: { in: sessionStoreIds } },
      }),
      this.prisma.storeMember.findFirst({
        where: { userId: dto.userBId, storeId: { in: sessionStoreIds } },
      }),
    ]);
    if (!memberA) {
      throw new NotFoundException('Primeiro jogador não está em nenhuma loja desta sessão');
    }
    if (!memberB) {
      throw new NotFoundException('Segundo jogador não está em nenhuma loja desta sessão');
    }

    // ── 3. Têm de estar em lojas diferentes ───────────────────────────────────
    if (memberA.storeId === memberB.storeId) {
      throw new BadRequestException('Os dois jogadores precisam estar em lojas diferentes');
    }

    // ── 4. Gerente da loja nunca troca ────────────────────────────────────────
    if (
      memberA.role === StoreRole.STORE_MANAGER ||
      memberB.role === StoreRole.STORE_MANAGER
    ) {
      throw new BadRequestException('O Gerente da Loja não pode ser trocado');
    }

    // ── 5. Mesmo papel — preserva papel único por loja ────────────────────────
    if (memberA.role !== memberB.role) {
      throw new BadRequestException(
        'A troca recíproca exige que os dois jogadores tenham o mesmo papel, para manter um único papel por loja',
      );
    }

    // ── 6. Limite de 2 saídas por loja (o swap conta 1 saída para cada loja) ───
    const [outboundA, outboundB] = await Promise.all([
      this.prisma.playerTransfer.count({
        where: { sessionId, fromStoreId: memberA.storeId },
      }),
      this.prisma.playerTransfer.count({
        where: { sessionId, fromStoreId: memberB.storeId },
      }),
    ]);
    if (outboundA >= 2) {
      throw new BadRequestException(
        'A loja do primeiro jogador já atingiu o limite de 2 transferências de saída',
      );
    }
    if (outboundB >= 2) {
      throw new BadRequestException(
        'A loja do segundo jogador já atingiu o limite de 2 transferências de saída',
      );
    }

    // ── 7. Execução atômica: vínculos trocados + duas auditorias de movimento ──
    const role = memberA.role;
    const storeA = memberA.storeId;
    const storeB = memberB.storeId;

    const { transferA, transferB } = await this.prisma.$transaction(async (tx) => {
      // A unicidade (storeId, role) é checada linha a linha, então `update` colidiria
      // com o slot ocupado do outro lado. Liberamos os dois slots e recriamos já trocados.
      await tx.storeMember.delete({ where: { id: memberA.id } });
      await tx.storeMember.delete({ where: { id: memberB.id } });
      await tx.storeMember.create({
        data: { storeId: storeB, userId: memberA.userId, role, joinedAt: memberA.joinedAt },
      });
      await tx.storeMember.create({
        data: { storeId: storeA, userId: memberB.userId, role, joinedAt: memberB.joinedAt },
      });

      const movementA = await tx.playerTransfer.create({
        data: {
          sessionId,
          userId: memberA.userId,
          fromStoreId: storeA,
          toStoreId: storeB,
          role,
        },
      });
      const movementB = await tx.playerTransfer.create({
        data: {
          sessionId,
          userId: memberB.userId,
          fromStoreId: storeB,
          toStoreId: storeA,
          role,
        },
      });
      return { transferA: movementA, transferB: movementB };
    });

    return {
      role,
      transfers: [
        {
          transferId: transferA.id,
          userId: memberA.userId,
          fromStoreId: storeA,
          toStoreId: storeB,
          transferredAt: transferA.transferredAt,
        },
        {
          transferId: transferB.id,
          userId: memberB.userId,
          fromStoreId: storeB,
          toStoreId: storeA,
          transferredAt: transferB.transferredAt,
        },
      ],
    };
  }

  /**
   * Retorna, por loja, quantas saídas já ocorreram nesta sessão para guiar a regra obrigatória (1-2 por loja).
   */
  async getTransferSummary(sessionId: string): Promise<TransferSessionSummary> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { stores: { select: { id: true, name: true } } },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    const outboundByStore = await this.prisma.playerTransfer.groupBy({
      by: ['fromStoreId'],
      where: { sessionId },
      _count: { fromStoreId: true },
    });
    const countMap = new Map(
      outboundByStore.map((row) => [row.fromStoreId, row._count.fromStoreId]),
    );

    const stores = session.stores.map((store) => {
      const outboundTransfers = countMap.get(store.id) ?? 0;
      return {
        storeId: store.id,
        storeName: store.name,
        outboundTransfers,
        minimumRequired: 1,
        maximumAllowed: 2,
        requirementMet: outboundTransfers >= 1 && outboundTransfers <= 2,
      };
    });

    return {
      sessionId,
      canAdvanceToRound2: stores.length > 0 && stores.every((store) => store.requirementMet),
      stores,
    };
  }

  async update(
    id: string,
    dto: UpdateStoreDto,
    userId: string,
  ): Promise<StoreSummary> {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { session: true },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    if (store.session.facilitatorId !== userId) {
      throw new ForbiddenException(
        'Apenas o facilitador dono da sessão pode editar esta loja',
      );
    }

    const updated = await this.prisma.store.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
    });

    return this.toSummary(updated);
  }

  async remove(id: string, userId: string): Promise<{ deleted: true }> {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { session: true },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    if (store.session.facilitatorId !== userId) {
      throw new ForbiddenException(
        'Apenas o facilitador dono da sessão pode excluir esta loja',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Folhas profundas: decisões dos planos
      const planIds = (
        await tx.operationalPlan.findMany({
          where: { storeId: id },
          select: { id: true },
        })
      ).map((p) => p.id);

      if (planIds.length) {
        await tx.poCategoryDecision.deleteMany({ where: { planId: { in: planIds } } });
        await tx.poCapexDecision.deleteMany({ where: { planId: { in: planIds } } });
      }

      await tx.operationalPlan.deleteMany({ where: { storeId: id } });

      await tx.userQuizAnswer.deleteMany({ where: { storeId: id } });
      await tx.quizAnswer.deleteMany({ where: { storeId: id } });

      await tx.storeMember.deleteMany({ where: { storeId: id } });
      await tx.roundResult.deleteMany({ where: { storeId: id } });
      await tx.slaEvent.deleteMany({ where: { storeId: id } });

      // PlayerTransfer tem duas FK para Store (fromStoreId e toStoreId)
      await tx.playerTransfer.deleteMany({
        where: {
          OR: [{ fromStoreId: id }, { toStoreId: id }],
        },
      });

      await tx.store.delete({ where: { id } });
    });

    return { deleted: true };
  }

  /**
   * Gera código curto alfanumérico para o jogador digitar na entrada — fácil de ler em sala de aula ou videoconferência.
   */
  private generateAccessCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Converte o registro do Prisma no formato estável da API.
   */
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
