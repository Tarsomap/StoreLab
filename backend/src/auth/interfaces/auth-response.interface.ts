import { UserRole } from '@prisma/client';

/**
 * Dados públicos do usuário devolvidos no login/registro (nunca enviamos hash de senha).
 */
export interface AuthUser {
  /** ID do usuário. */
  id: string;
  /** Nome para exibir no jogo. */
  name: string;
  /** E-mail da conta. */
  email: string;
  /** Facilitador ou jogador. */
  role: UserRole;
  /** Se o usuário tem 2FA ativado. */
  twoFactorEnabled: boolean;
}

/**
 * Resposta completa após cadastro ou login: tokens para o cliente guardar e objeto user para a UI.
 * O token curto vai no cabeçalho das próximas requisições; o refresh fica em storage mais estável para renovar.
 */
export interface AuthResponse {
  /** JWT de acesso (vida curta). */
  token: string;
  /** Token para pedir novo JWT sem senha (vida longa; no servidor guardamos só o hash). */
  refreshToken: string;
  user: AuthUser;
}

/**
 * Resposta só com o novo JWT após /auth/refresh — o cliente continua com o mesmo refresh até o próximo login completo.
 */
export interface RefreshResponse {
  /** Novo JWT de acesso após refresh bem-sucedido. */
  token: string;
}
