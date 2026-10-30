import { cookies } from 'next/headers';

export const RP_NAME = 'Diogo Barber Shop';
const CHALLENGE_COOKIE_NAME = 'passkey_challenge';

/**
 * Obtiene el RP ID y el Origin esperado a partir de los encabezados de la petición
 */
export function getWebAuthnServerConfig(request: Request) {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    'localhost:3000';

  // El RP ID no debe incluir puerto (e.g. 'localhost' o 'diogobarbershop.com')
  const rpID = host.split(':')[0];

  const proto =
    request.headers.get('x-forwarded-proto') ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1')
      ? 'http'
      : 'https');

  const origin = `${proto}://${host}`;

  return { rpID, origin };
}

/**
 * Guarda el challenge temporal en una cookie HttpOnly segura (5 minutos de validez)
 */
export async function setPasskeyChallengeCookie(challenge: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE_NAME, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 300, // 5 minutos
  });
}

/**
 * Obtiene el challenge actual y limpia la cookie
 */
export async function getAndClearPasskeyChallengeCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const challenge = cookieStore.get(CHALLENGE_COOKIE_NAME)?.value || null;
  if (challenge) {
    cookieStore.delete(CHALLENGE_COOKIE_NAME);
  }
  return challenge;
}
