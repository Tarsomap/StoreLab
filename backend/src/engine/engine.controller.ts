import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EngineService } from './engine.service';
import { RunRoundDto } from './dto/run-round.dto';

/**
 * API HTTP do motor: apenas o facilitador pode disparar o cálculo de uma rodada.
 * O trabalho pesado fica no EngineService; aqui só validamos o corpo e chamamos o serviço.
 */
@Controller('engine')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EngineController {
  constructor(private readonly engineService: EngineService) {}

  /**
   * Executa o cálculo completo da rodada informada para todas as lojas da sessão
   * e persiste resultados (e eventos de SLA). Resposta simples para o cliente HTTP.
   *
   * @param dto - Identificador da sessão e número da rodada (1, 2 ou 3).
   * @returns Mensagem de sucesso após o processamento.
   */
  @Post('run-round')
  @Roles(UserRole.FACILITATOR)
  async runRound(@Body() dto: RunRoundDto): Promise<{ message: string }> {
    await this.engineService.runRound(dto.sessionId, dto.round);
    return { message: `Round ${dto.round} calculated successfully` };
  }
}
