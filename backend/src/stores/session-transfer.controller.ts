import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StoresService } from './stores.service';
import { SwapDto } from './dto/swap.dto';
import { TransferDto } from './dto/transfer.dto';
import {
  SwapResponse,
  TransferResponse,
  TransferSessionSummary,
} from './interfaces/store.interface';

/**
 * Endpoint REST aninhado na sessão: `POST /sessions/:sessionId/transfers`.
 * Fica separado do `StoresController` para a URL refletir a regra de negócio — “movimentação de pessoas dentro desta partida”,
 * sempre decidida pelo facilitador (como no varejo real a matriz realoca gente entre filiais, não o cliente na fila).
 */
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionTransferController {
  /** Delega a lógica pesada ao StoresService.transfer (validações de fase e limite). */
  constructor(private readonly storesService: StoresService) {}

  /**
   * Registra a troca de loja de um jogador, somente na fase RECONFIGURATION e com todas as validações do serviço.
   */
  @Post(':sessionId/transfers')
  @Roles(UserRole.FACILITATOR)
  transfer(
    @Param('sessionId') sessionId: string,
    @Body() dto: TransferDto,
  ): Promise<TransferResponse> {
    return this.storesService.transfer(sessionId, dto);
  }

  /**
   * Troca recíproca de dois jogadores de mesmo papel entre duas lojas (caso de lojas cheias), só na RECONFIGURATION.
   * Espelha o padrão do endpoint de transferência, mas resolve o impasse de swap movendo os dois ao mesmo tempo.
   */
  @Post(':sessionId/swaps')
  @Roles(UserRole.FACILITATOR)
  swap(
    @Param('sessionId') sessionId: string,
    @Body() dto: SwapDto,
  ): Promise<SwapResponse> {
    return this.storesService.swap(sessionId, dto);
  }

  /**
   * Mostra progresso da regra de transferências obrigatórias por loja (1-2 saídas).
   */
  @Get(':sessionId/transfers/summary')
  @Roles(UserRole.FACILITATOR)
  getSummary(
    @Param('sessionId') sessionId: string,
  ): Promise<TransferSessionSummary> {
    return this.storesService.getTransferSummary(sessionId);
  }
}
