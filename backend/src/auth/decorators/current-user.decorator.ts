import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Injeta o usuário autenticado (payload do JWT) como parâmetro do método do controller.
 * Evita repetir código que pega request.user manualmente e deixa explícito que aquele endpoint precisa de quem está logado.
 * Só funciona depois do JwtAuthGuard ter validado o token e preenchido request.user.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    // Mesmo request que o Passport encheu após validar o JWT; tipamos user para o TypeScript ajudar nos controllers.
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
