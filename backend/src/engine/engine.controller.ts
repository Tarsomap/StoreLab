import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EngineService } from './engine.service';
import { RunRoundDto } from './dto/run-round.dto';

@Controller('engine')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EngineController {
  constructor(private readonly engineService: EngineService) {}

  @Post('run-round')
  @Roles(UserRole.FACILITATOR)
  async runRound(@Body() dto: RunRoundDto): Promise<{ message: string }> {
    await this.engineService.runRound(dto.sessionId, dto.round);
    return { message: `Round ${dto.round} calculated successfully` };
  }
}
