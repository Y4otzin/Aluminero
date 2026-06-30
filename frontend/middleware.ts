import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware de autenticación.
 *
 * Protege las rutas bajo /dashboard/* redirigiendo a /auth/login
 * si el usuario no tiene un token de autenticación (cookie auth_token).
 *
 * También redirige al dashboard si el usuario ya está autenticado
 * e intenta acceder a /auth/* (excepto forgot-password y reset-password).
 */

const PROTECTED_PATHS = ['/dashboard'];

const AUTH_PATHS = ['/auth/login', '/auth/register'];

const TOKEN_COOKIE = 'auth_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isAuthenticated = !!token;

  // ─── Proteger rutas del dashboard ────────────────────

  const isProtected = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Redirigir al dashboard si ya está autenticado ───

  const isAuthPage = AUTH_PATHS.some((path) => pathname === path);

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// ─── Configuración de rutas donde se ejecuta ───────────

export const config = {
  matcher: ['/dashboard/:path*', '/auth/login', '/auth/register'],
};
