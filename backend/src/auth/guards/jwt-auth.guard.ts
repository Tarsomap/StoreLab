import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guarda de rota que exige um JWT válido na requisição (estratégia nomeada 'jwt' registrada pelo JwtStrategy).
 * Sem esse guard, qualquer um chamaria APIs do jogo; com ele, só quem fez login com token correto passa —
 * equivalente a pedir o crachá na entrada do simulador.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
