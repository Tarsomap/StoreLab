/**
 * Página raiz `/`: o middleware costuma redirecionar antes; se alguém cair aqui direto, lemos o cookie de papel
 * e mandamos para login, dashboard (facilitador) ou entrar na partida (jogador).
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

/** Redirecionamento simples conforme cookie `user_role` (espelha a regra do middleware). */
export default function RootPage() {
  const role = cookies().get('user_role')?.value;
  if (!role) redirect('/login');
  if (role === 'FACILITATOR') redirect('/dashboard');
  redirect('/join');
}
