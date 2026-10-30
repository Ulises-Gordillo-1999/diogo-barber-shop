'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { comparePassword, signToken, DUMMY_BCRYPT_HASH } from '@/utils/auth';
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginAttempts,
} from '@/utils/rateLimit';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export interface AuthState {
  error?: string;
  remainingAttempts?: number;
  lockedSeconds?: number;
  success?: boolean;
}

/**
 * Server Action endurecida para iniciar sesión de administradores y barberos
 * Incluye: Rate Limiting por IP+Email, mitigación de Timing Enumeration y cookies HttpOnly
 */
export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email')?.toString().trim().toLowerCase();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return { error: 'Por favor, ingresá tu correo electrónico y contraseña.' };
  }

  if (email.length > 254 || password.length > 128) {
    return { error: 'Credenciales inválidas.' };
  }

  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  const clientIp =
    forwardedFor?.split(',')[0]?.trim() ||
    headerStore.get('x-real-ip') ||
    'unknown-ip';
  const rateLimitKey = `${clientIp}:${email}`;

  // 1. Verificar límite de intentos (Protección Anti-Fuerza Bruta)
  const currentLimit = checkLoginRateLimit(rateLimitKey);
  if (!currentLimit.allowed) {
    const minutes = Math.ceil(currentLimit.retryAfterSeconds / 60);
    return {
      error: `Demasiados intentos fallidos. Por seguridad, el acceso está bloqueado temporalmente por ${minutes} min.`,
      remainingAttempts: 0,
      lockedSeconds: currentLimit.retryAfterSeconds,
    };
  }

  try {
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = userList[0];

    // 2. Comparación en tiempo constante incluso si el usuario no existe (Anti-Enumeration)
    const targetHash = user ? user.passwordHash : DUMMY_BCRYPT_HASH;
    const isPasswordValid = await comparePassword(password, targetHash);

    if (!user || !isPasswordValid) {
      const updatedLimit = recordFailedLoginAttempt(rateLimitKey);
      if (!updatedLimit.allowed) {
        return {
          error:
            'Has alcanzado el máximo de 5 intentos fallidos. Cuenta protegida por 15 minutos.',
          remainingAttempts: 0,
          lockedSeconds: updatedLimit.retryAfterSeconds,
        };
      }

      return {
        error: 'Credenciales inválidas. Verificá tu correo y contraseña.',
        remainingAttempts: updatedLimit.remainingAttempts,
      };
    }

    if (!user.active) {
      return {
        error: 'Tu cuenta se encuentra suspendida. Contactá al administrador.',
      };
    }

    // 3. Login exitoso: limpiar contador de fallos y emitir JWT firmado
    resetLoginAttempts(rateLimitKey);

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // 4. Guardar cookie HttpOnly segura con expiración sincronizada a 30 días para Android PWA
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 días
    });
  } catch (error) {
    console.error('Error en loginAction:', error);
    return { error: 'Ocurrió un error al procesar el ingreso. Intentá de nuevo.' };
  }

  redirect('/dashboard');
}

/**
 * Server Action para cerrar sesión eliminando la cookie HttpOnly desde el servidor
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  cookieStore.delete('auth_token');
  redirect('/login');
}
