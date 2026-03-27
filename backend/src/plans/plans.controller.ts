import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PlansService } from './plans.service';
import { CategoryDecisionDto } from './dto/category-decision.dto';
import { CapexDecisionDto } from './dto/capex-decision.dto';
import { WorkforceDto } from './dto/workforce.dto';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // Retorna (ou cria) o plano de uma loja para a configVersion especificada
  @Get(':storeId/config/:configVersion')
  getOrCreate(
    @Param('storeId') storeId: string,
    @Param('configVersion', ParseIntPipe) configVersion: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.plansService.getOrCreate(storeId, configVersion, user.sub);
  }

  @Put(':planId/category-decision')
  updateCategoryDecision(
    @Param('planId') planId: string,
    @Body() dto: CategoryDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.plansService.updateCategoryDecision(planId, dto, user.sub);
  }

  @Put(':planId/capex-decision')
  updateCapexDecision(
    @Param('planId') planId: string,
    @Body() dto: CapexDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.plansService.updateCapexDecision(planId, dto, user.sub);
  }

  @Put(':planId/workforce')
  updateWorkforce(
    @Param('planId') planId: string,
    @Body() dto: WorkforceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.plansService.updateWorkforce(planId, dto, user.sub);
  }

  @Post(':planId/confirm')
  confirmPlan(
    @Param('planId') planId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.plansService.confirmPlan(planId, user.sub);
  }
}
