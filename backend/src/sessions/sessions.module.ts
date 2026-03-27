import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EngineModule } from '../engine/engine.module';
import { ResultsModule } from '../results/results.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [AuthModule, EngineModule, ResultsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
