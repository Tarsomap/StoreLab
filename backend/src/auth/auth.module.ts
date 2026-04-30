import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';

/**
 * Módulo de autenticação do StoreLab: cadastro, login, tokens e peças que protegem as rotas.
 * Registra o Passport (padrão usado pelo Nest para “estratégias” de login), o JWT com segredo e tempo de vida,
 * e exporta guards para outros módulos (ex.: motor do jogo) reutilizarem a mesma proteção.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      // Segredo e validade vêm do ambiente para não ficar fixo no código (produção usa variáveis reais).
      secret: process.env.JWT_SECRET ?? 'fallback-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1h' },
    }),
    forwardRef(() => AuditLogModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, MfaService, JwtStrategy, JwtAuthGuard, RolesGuard],
  // Outros módulos importam JwtModule e os guards para exigir login e papéis (facilitador vs jogador).
  exports: [JwtModule, AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
