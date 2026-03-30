import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GameGateway } from './game.gateway';

/**
 * Módulo do “canal ao vivo” WebSocket: disponibiliza o GameGateway em toda a aplicação sem importar de novo em cada feature.
 * Importa AuthModule porque o gateway valida o mesmo JWT do login ao abrir a conexão — quem não está logado não entra na sala.
 */
@Global()
@Module({
  imports: [AuthModule],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GatewayModule {}
