import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { StoresModule } from './stores/stores.module';
import { PlansModule } from './plans/plans.module';
import { QuizModule } from './quiz/quiz.module';
import { EngineModule } from './engine/engine.module';
import { ResultsModule } from './results/results.module';
import { GatewayModule } from './gateway/gateway.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AssistantModule } from './assistant/assistant.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    StoresModule,
    PlansModule,
    QuizModule,
    EngineModule,
    ResultsModule,
    GatewayModule,
    AuditLogModule,
    AssistantModule,
  ],
})
export class AppModule {}
