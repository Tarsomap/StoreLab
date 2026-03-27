import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionTransferController } from './session-transfer.controller';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
  imports: [AuthModule],
  controllers: [StoresController, SessionTransferController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
