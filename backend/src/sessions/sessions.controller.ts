import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  create(
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessionsService.create(dto, user.sub);
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
}
