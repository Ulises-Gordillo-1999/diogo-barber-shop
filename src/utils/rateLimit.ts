/**
 * Sistema de Protección Anti-Fuerza Bruta (Sliding Window Rate Limiter)
 * Bloquea temporalmente tras 5 intentos fallidos consecutivos en una ventana de 15 minutos.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const loginAttemptsStore = new Map<string, AttemptRecord>();

export interface RateLimitStatus {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

export function checkLoginRateLimit(key: string): RateLimitStatus {
  const now = Date.now();
  const record = loginAttemptsStore.get(key);

  if (!record) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  // Si el bloqueo o la ventana de tiempo ya expiró, limpiar registro
  if (
    (record.lockedUntil && now >= record.lockedUntil) ||
    (!record.lockedUntil && now - record.firstAttemptAt >= WINDOW_MS)
  ) {
    loginAttemptsStore.delete(key);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
  };
}

export function recordFailedLoginAttempt(key: string): RateLimitStatus {
  const now = Date.now();
  const existing = loginAttemptsStore.get(key);

  if (!existing || now - existing.firstAttemptAt >= WINDOW_MS) {
    const record: AttemptRecord = {
      count: 1,
      firstAttemptAt: now,
      lockedUntil: null,
    };
    loginAttemptsStore.set(key, record);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - 1,
      retryAfterSeconds: 0,
    };
  }

  const newCount = existing.count + 1;
  const lockedUntil = newCount >= MAX_ATTEMPTS ? now + WINDOW_MS : null;

  loginAttemptsStore.set(key, {
    ...existing,
    count: newCount,
    lockedUntil,
  });

  return {
    allowed: newCount < MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - newCount),
    retryAfterSeconds: lockedUntil ? Math.ceil(WINDOW_MS / 1000) : 0,
  };
}

export function resetLoginAttempts(key: string): void {
  loginAttemptsStore.delete(key);
}

export function clearAllRateLimits(): void {
  loginAttemptsStore.clear();
}

