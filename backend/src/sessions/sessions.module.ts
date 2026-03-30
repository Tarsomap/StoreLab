import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EngineModule } from '../engine/engine.module';
import { ResultsModule } from '../results/results.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

/**
 * Módulo de sessões da partida: criação, consulta, avanço de fase e disparo do motor ao “executar rodada”.
 * Importa autenticação (guards já usados no controller), o motor de cálculo e resultados para emitir ranking ao encerrar.
 */
@Module({
  imports: [AuthModule, EngineModule, ResultsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
