import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '@prisma/client';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { JoinStoreDto } from './dto/join-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

/**
 * API das lojas sob `/stores`: criar equipe, entrar por código, ver “minhas” lojas, detalhe e membros.
 * Tudo exige JWT — só quem está logado monta time ou vê dados da loja.
 */
@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  /**
   * Encaminha para o serviço que aplica limite de 4 lojas por sessão e gera o código de acesso.
   */
  constructor(private readonly storesService: StoresService) {}

  /**
   * Cria uma nova loja na sessão indicada (quem chama costuma ser o facilitador pelo fluxo do front).
   */
  @Post()
  create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  /**
   * Jogador entra na loja com código + papel; se já for membro, devolve a mesma loja sem erro (reentrada tranquila).
   */
  @Post('join')
  join(
    @Body() dto: JoinStoreDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.storesService.join(dto, user.sub);
  }

  /**
   * Lista lojas em que o usuário logado já tem papel — útil após fechar o app e voltar.
   */
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.storesService.findMine(user.sub);
  }

  /**
   * Detalhe básico de uma loja por id (nome, sessão, código).
   */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.storesService.findById(id);
  }

  /**
   * Quem está no time, com e-mail e data de entrada — para o grupo se organizar antes de preencher o plano operacional.
   */
  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.storesService.getMembers(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.storesService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.storesService.remove(id, user.sub);
  }
}
