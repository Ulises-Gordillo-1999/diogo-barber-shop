import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  clearAllRateLimits,
} from '../utils/rateLimit';
import {
  signToken,
  verifyToken,
  hashPassword,
  comparePassword,
} from '../utils/auth';
import { verifyMercadoPagoSignature } from '../utils/mercadopago';
import { parseDateTime } from '../utils/availability';

describe('1. Seguridad de Inicio de Sesión — Rate Limiting & Brute-Force Lockout', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it('permite intentos iniciales cuando no hay fallos previos', () => {
    const status = checkLoginRateLimit('192.168.1.10:admin@diogobarber.com');
    assert.equal(status.allowed, true);
    assert.equal(status.remainingAttempts, 5);
  });

  it('bloquea la cuenta temporalmente tras 5 intentos fallidos consecutivos', () => {
    const key = '192.168.1.10:admin@diogobarber.com';

    for (let i = 0; i < 5; i++) {
      recordFailedLoginAttempt(key);
    }

    const statusAfter5 = checkLoginRateLimit(key);
    assert.equal(statusAfter5.allowed, false);
    assert.equal(statusAfter5.remainingAttempts, 0);
    assert.ok(statusAfter5.retryAfterSeconds > 0);
  });

  it('limpia el contador de fallos al iniciar sesión exitosamente', () => {
    const key = '192.168.1.10:admin@diogobarber.com';
    recordFailedLoginAttempt(key);
    recordFailedLoginAttempt(key);

    assert.equal(checkLoginRateLimit(key).remainingAttempts, 3);

    resetLoginAttempts(key);
    const afterReset = checkLoginRateLimit(key);
    assert.equal(afterReset.allowed, true);
    assert.equal(afterReset.remainingAttempts, 5);
  });
});

describe('2. Criptografía JWT & Hash de Contraseñas (RBAC)', () => {
  it('firma y verifica correctamente un token JWT válido con rol ADMIN', async () => {
    const payload = {
      id: '11111111-2222-3333-4444-555555555555',
      email: 'admin@diogobarber.com',
      role: 'ADMIN' as const,
      name: 'Diego Rodolfo Nieva',
    };

    const token = await signToken(payload);
    assert.ok(typeof token === 'string' && token.split('.').length === 3);

    const decoded = await verifyToken(token);
    assert.notEqual(decoded, null);
    assert.equal(decoded?.id, payload.id);
    assert.equal(decoded?.email, payload.email);
    assert.equal(decoded?.role, 'ADMIN');
  });

  it('rechaza un token JWT adulterado devolviendo null', async () => {
    const token = await signToken({
      id: '11111111-2222-3333-4444-555555555555',
      email: 'admin@diogobarber.com',
      role: 'ADMIN',
      name: 'Diogo',
    });

    const parts = token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.firma_adulterada_invalida`;

    const decoded = await verifyToken(tamperedToken);
    assert.equal(decoded, null);
  });

  it('hashea contraseñas con bcrypt y valida coincidencias de forma segura', async () => {
    const plain = 'ClaveSeguraDiogo2026!';
    const hash = await hashPassword(plain);

    assert.notEqual(hash, plain);
    assert.equal(await comparePassword(plain, hash), true);
    assert.equal(await comparePassword('ClaveIncorrecta', hash), false);
  });
});

describe('3. Validación Criptográfica HMAC-SHA256 de Webhooks Mercado Pago', () => {
  const TEST_SECRET = 'test_webhook_secret_diogo_barber_2026';

  it('acepta una firma x-signature auténtica generada con el secret configurado', () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = TEST_SECRET;
    const dataId = '9988776655';
    const requestId = 'req-uuid-12345';
    const ts = '1730123456';

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const validHash = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(manifest)
      .digest('hex');

    const xSignature = `ts=${ts},v1=${validHash}`;
    const isValid = verifyMercadoPagoSignature(xSignature, requestId, dataId);
    assert.equal(isValid, true);
  });

  it('rechaza una firma x-signature falsificada o con longitud distinta', () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = TEST_SECRET;
    const isValidForged = verifyMercadoPagoSignature(
      'ts=1730123456,v1=0000000000000000000000000000000000000000000000000000000000000000',
      'req-uuid-12345',
      '9988776655'
    );
    assert.equal(isValidForged, false);

    const isValidShort = verifyMercadoPagoSignature(
      'ts=1730123456,v1=corto',
      'req-uuid-12345',
      '9988776655'
    );
    assert.equal(isValidShort, false);
  });
});

describe('4. Motor de Fechas y Horarios de Reserva', () => {
  it('parsea correctamente una fecha YYYY-MM-DD y hora HH:mm en objeto Date local', () => {
    const dt = parseDateTime('2026-10-28', '17:30');
    assert.equal(dt.getFullYear(), 2026);
    assert.equal(dt.getMonth(), 9); // Octubre = 9
    assert.equal(dt.getDate(), 28);
    assert.equal(dt.getHours(), 17);
    assert.equal(dt.getMinutes(), 30);
  });
});

