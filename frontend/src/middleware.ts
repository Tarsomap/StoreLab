/**
 * Camada que roda antes de servir páginas: decide se o visitante pode ver cada URL sem carregar o React.
 * Usamos cookie `user_role` (gravado no login) para saber se há sessão e qual o papel — assim jogador não acessa
 * `/dashboard` e usuário logado não fica preso na tela de login.
 */
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

/** Aplica redirecionamentos de auth e bloqueio de dashboard para não-facilitadores. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get('user_role')?.value;
  const isAuthenticated = !!role;

  // Login/cadastro: se já está logado, manda direto para o destino habitual do papel (evita loop).
  if (PUBLIC_PATHS.includes(pathname)) {
    if (isAuthenticated) {
      const dest = role === 'FACILITATOR' ? '/dashboard' : '/join';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Raiz: mesma lógica da página server-side, mas mais cedo na pipeline.
  if (pathname === '/') {
    const dest = isAuthenticated
      ? role === 'FACILITATOR'
        ? '/dashboard'
        : '/join'
      : '/login';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Demais rotas exigem login; guardamos `from` para voltar depois do login.
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Painel do facilitador: jogador autenticado vai para /join.
  if (pathname.startsWith('/dashboard') && role !== 'FACILITATOR') {
    return NextResponse.redirect(new URL('/join', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
};
