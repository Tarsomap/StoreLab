import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get('user_role')?.value;
  const isAuthenticated = !!role;

  // Let public paths through (or redirect logged-in users away)
  if (PUBLIC_PATHS.includes(pathname)) {
    if (isAuthenticated) {
      const dest = role === 'FACILITATOR' ? '/dashboard' : '/join';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Root: redirect based on auth/role
  if (pathname === '/') {
    const dest = isAuthenticated
      ? role === 'FACILITATOR'
        ? '/dashboard'
        : '/join'
      : '/login';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Protected paths: require authentication
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /dashboard is FACILITATOR-only
  if (pathname.startsWith('/dashboard') && role !== 'FACILITATOR') {
    return NextResponse.redirect(new URL('/join', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
};
