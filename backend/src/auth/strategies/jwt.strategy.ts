import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Estratégia Passport que lê o JWT do cabeçalho Authorization e confere assinatura e prazo.
 * Depois que o guard autoriza a rota, o objeto retornado por validate fica em request.user para o resto da requisição
 * (decorator CurrentUser, RolesGuard, etc.). Assim o jogo sabe “quem está jogando” sem consultar o banco em toda requisição.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Configura de onde vem o token (cabeçalho Bearer), se expiração deve ser respeitada e qual segredo valida a assinatura.
   */
  constructor() {
    super({
      // Padrão comum: "Authorization: Bearer <token>" — fácil para o front enviar em toda chamada à API.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Rejeitamos token fora da validade em vez de aceitar silenciosamente.
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'fallback-secret',
    });
  }

  /**
   * Chamado após o passport-jwt já ter verificado assinatura e expiração; aqui só garantimos campos mínimos.
   * O retorno vira request.user — por isso exigimos sub (id), email e role para as rotas não quebrarem depois.
   *
   * @param payload - Conteúdo decodificado do JWT.
   * @returns O mesmo payload para o Nest anexar ao request.
   * @throws UnauthorizedException se faltar dado essencial (token malformado ou antigo).
   */
  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
