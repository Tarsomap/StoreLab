import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EngineController } from './engine.controller';
import { EngineService } from './engine.service';
import { CsatService } from './csat.service';
import { DemandService } from './demand.service';
import { ShrinkageService } from './shrinkage.service';
import { FinancialService } from './financial.service';
import { SlaService } from './sla.service';
import { RandomEventsService } from './random-events.service';

/**
 * Módulo NestJS do motor de cálculo: agrupa serviços que simulam uma rodada
 * (demanda, receita, SLA, perdas, EBITDA) e expõe o endpoint para o facilitador rodar a rodada.
 */
@Module({
  imports: [AuthModule],
  controllers: [EngineController],
  providers: [
    EngineService,
    CsatService,
    DemandService,
    ShrinkageService,
    FinancialService,
    SlaService,
    RandomEventsService,
  ],
  exports: [
    EngineService,
    CsatService,
    DemandService,
    ShrinkageService,
    FinancialService,
    SlaService,
    RandomEventsService,
  ],
})
export class EngineModule {}
