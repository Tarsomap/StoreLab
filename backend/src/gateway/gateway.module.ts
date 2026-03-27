import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GameGateway } from './game.gateway';

@Global()
@Module({
  imports: [AuthModule],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GatewayModule {}
