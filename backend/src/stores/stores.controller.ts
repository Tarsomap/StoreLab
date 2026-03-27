import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { JoinStoreDto } from './dto/join-store.dto';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Post('join')
  join(
    @Body() dto: JoinStoreDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.storesService.join(dto, user.sub);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.storesService.getMembers(id);
  }
}
