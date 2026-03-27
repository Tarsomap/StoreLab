import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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

const ROUND_BY_STATUS: Partial<Record<SessionStatus, number>> = {
  [SessionStatus.ROUND_1]: 1,
  [SessionStatus.ROUND_2]: 2,
  [SessionStatus.ROUND_3]: 3,
};

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly engineService: EngineService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  create(
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessionsService.create(dto, user.sub);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  getMySessions(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.getByFacilitator(user.sub);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }

  @Patch(':id/advance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  advance(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessionsService.advanceStatus(id, user.sub);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.sessionsService.getStatus(id);
  }

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
