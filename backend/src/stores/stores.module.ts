import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionTransferController } from './session-transfer.controller';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

/**
 * Módulo das lojas: criação na sessão, entrada de jogadores por código, equipe e transferência de pessoas entre lojas.
 * O controller de transferências fica sob o prefixo `sessions` na URL, mas usa o mesmo serviço — o facilitador age no contexto da partida.
 */
@Module({
  imports: [AuthModule],
  controllers: [StoresController, SessionTransferController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
