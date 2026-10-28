import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING =
  process.env.JWT_SECRET ||
  'diogo_barber_ultra_secure_jwt_secret_key_minimum_32_characters';

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const JWT_ISSUER = 'diogo-barber-shop';
const JWT_AUDIENCE = 'diogo-barber-staff';

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  let isValidSession = false;
  let userRole: 'ADMIN' | 'BARBER' | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      isValidSession = true;
      userRole = (payload as { role?: 'ADMIN' | 'BARBER' }).role || null;
    } catch {
      isValidSession = false;
    }
  }

  // 1. Proteger rutas del panel administrativo (/dashboard/*)
  if (pathname.startsWith('/dashboard')) {
    if (!isValidSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      if (token) {
        response.cookies.delete('auth_token');
      }
      return applySecurityHeaders(response);
    }

    // Validación RBAC estricta: /dashboard/usuarios solo para ADMIN
    if (pathname.startsWith('/dashboard/usuarios') && userRole !== 'ADMIN') {
      return applySecurityHeaders(
        NextResponse.redirect(new URL('/dashboard', request.url))
      );
    }
  }

  // 2. Si el usuario ya está autenticado e intenta ir a /login, redirigir al dashboard
  if (pathname === '/login' && isValidSession) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/dashboard', request.url))
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
