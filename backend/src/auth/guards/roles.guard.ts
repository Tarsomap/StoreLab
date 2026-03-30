import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Guarda que restringe rotas a papéis específicos (facilitador vs jogador), depois que o JWT já foi aceito.
 * O decorator @Roles(...) grava metadados na rota; este guard lê esses metadados e compara com request.user.role.
 * Assim o mesmo login serve para os dois perfis, mas só o facilitador roda rodadas ou cria sessão, por exemplo.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Reflector lê metadados que decorators colocam no método/classe sem precisar de ifs espalhados no controller.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Retorna true se a rota não pediu papel nenhum ou se o usuário tem um dos papéis exigidos.
   *
   * @param context - Contexto HTTP atual (inclui request com user preenchido pelo JwtAuthGuard).
   * @returns Se a requisição pode seguir para o controller.
   */
  canActivate(context: ExecutionContext): boolean {
    // Une metadados do método e da classe: assim dá para marcar só um endpoint ou o controller inteiro.
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sem @Roles, não restringimos por papel — só o login já basta.
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    // includes evita repetir vários ifs quando a rota aceita mais de um papel.
    return required.includes(request.user?.role);
  }
}
