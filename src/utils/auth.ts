import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET_STRING =
  process.env.JWT_SECRET ||
  'diogo_barber_ultra_secure_jwt_secret_key_minimum_32_characters';

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export const JWT_ISSUER = 'diogo-barber-shop';
export const JWT_AUDIENCE = 'diogo-barber-staff';

// Hash ficticio precalculado para mitigación de ataques de enumeración por tiempo (Timing Attack)
export const DUMMY_BCRYPT_HASH =
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL8.x3W2u';

export interface TokenPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'BARBER';
  name: string;
}

/**
 * Firma un JWT con expiración de 24 horas e identificadores estrictos de emisor y audiencia
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

/**
 * Verifica y decodifica un JWT con jose validando firma, expiración, issuer y audience
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (
      typeof payload.id !== 'string' ||
      typeof payload.email !== 'string' ||
      (payload.role !== 'ADMIN' && payload.role !== 'BARBER')
    ) {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: typeof payload.name === 'string' ? payload.name : '',
    };
  } catch {
    return null;
  }
}

/**
 * Hashea una contraseña usando bcryptjs (12 rondas de salt según estándar OWASP)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compara contraseña plana con hash almacenado
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Obtiene el usuario autenticado actual desde las cookies en Server Components / Server Actions
 */
export async function getSessionUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
