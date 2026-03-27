import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StoresService } from './stores.service';
import { TransferDto } from './dto/transfer.dto';
import { TransferResponse } from './interfaces/store.interface';

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionTransferController {
  constructor(private readonly storesService: StoresService) {}

  @Post(':sessionId/transfers')
  @Roles(UserRole.FACILITATOR)
  transfer(
    @Param('sessionId') sessionId: string,
    @Body() dto: TransferDto,
  ): Promise<TransferResponse> {
    return this.storesService.transfer(sessionId, dto);
  }
}
