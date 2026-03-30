import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EngineService } from '../engine/engine.service';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';

/**
 * Liga o estado atual da sessão ao número da rodada que o motor sabe calcular (1, 2 ou 3).
 * Só nesses três estados faz sentido rodar o engine — se chamarem “executar” durante SETUP ou RECONFIGURATION,
 * o cálculo não bateria com o que o jogo prometeu aos jogadores (primeiro fecha planos, depois processa números).
 */
const ROUND_BY_STATUS: Partial<Record<SessionStatus, number>> = {
  [SessionStatus.ROUND_1]: 1,
  [SessionStatus.ROUND_2]: 2,
  [SessionStatus.ROUND_3]: 3,
};

/**
 * Rotas HTTP das partidas: sempre exigem login; ações de “dono” exigem papel facilitador.
 * Jogadores autenticados podem consultar sessão/status/estoque para jogar, mas não criam partida nem avançam fase sozinhos.
 */
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  /**
   * Serviço de sessões para CRUD e estado; motor para disparar o cálculo quando a rodada está “na hora certa”.
   */
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly engineService: EngineService,
  ) {}

  /**
   * Cria uma nova sessão vinculada ao facilitador atual.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  create(
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessionsService.create(dto, user.sub);
  }

  /**
   * Lista sessões do facilitador logado (dashboard).
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  getMySessions(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.getByFacilitator(user.sub);
  }

  /**
   * Detalhe simples de uma sessão por id — qualquer usuário logado pode ver (ex.: jogador entrou pelo código e precisa do contexto).
   */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }

  /**
   * Avança um passo na máquina de estados (facilitador dono da sessão).
   * Ver comentários no SessionsService sobre por que a ordem é fixa e por que só o dono avança.
   */
  @Patch(':id/advance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  advance(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessionsService.advanceStatus(id, user.sub);
  }

  /**
   * Snapshot completo para painel: estado + lojas, membros, PO confirmado, caixa e último EBITDA.
   */
  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.sessionsService.getStatus(id);
  }

  /**
   * Estoque compartilhado por categoria para uma versão de plano (query configVersion obrigatória).
   * ParseIntPipe garante número inteiro — string inválida vira 400 antes de bagunçar o groupBy no banco.
   */
  @Get(':id/stock-availability')
  getStockAvailability(
    @Param('id') id: string,
    @Query('configVersion', ParseIntPipe) configVersion: number,
  ) {
    return this.sessionsService.getStockAvailability(id, configVersion);
  }

  /**
   * Roda o motor financeiro da rodada que corresponde ao estado atual (1, 2 ou 3).
   *
   * Dupla checagem de facilitador: mesmo com @Roles, alguém poderia tentar id de sessão de outro dono — por isso comparamos facilitatorId.
   * Só executamos se o status for ROUND_1, ROUND_2 ou ROUND_3; em outras fases o erro explica que ainda não é hora de calcular,
   * para o facilitador alinhar “primeiro avance até a rodada ativa, depois execute”.
   */
  @Post(':id/execute')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  async execute(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const session = await this.sessionsService.findById(id);
    if (session.facilitatorId !== user.sub) {
      throw new BadRequestException('Apenas o facilitador pode executar a rodada');
    }
    const round = ROUND_BY_STATUS[session.status];
    if (!round) {
      throw new BadRequestException(
        'A sessão não está em um estado de rodada executável',
      );
    }
    await this.engineService.runRound(id, round);
    return { message: `Rodada ${round} executada com sucesso` };
  }
}
