import { UserRole } from '@prisma/client';

/**
 * Conteúdo que colocamos dentro do JWT de acesso (e também base do refresh): identidade mínima para autorizar rotas.
 * "sub" é o padrão JWT para identificador do usuário — bibliotecas e tutoriais esperam esse nome.
 */
export interface JwtPayload {
  /** ID do usuário no banco (subject do token). */
  sub: string;
  /** E-mail para exibir ou auditar sem nova consulta. */
  email: string;
  /** Papel no jogo: facilitador controla sessão; jogador participa das lojas. */
  role: UserRole;
}
