import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import crypto from 'crypto';
import { db } from '@/db';
import { appointments, cashTransactions, services } from '@/db/schema';
import { eq } from 'drizzle-orm';

export function getMpClient() {
  const token =
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    'APP_USR-mock-token-diogo-barber';
  return new MercadoPagoConfig({
    accessToken: token,
    options: {
      timeout: 10000,
    },
  });
}

export function getMpPreference() {
  return new Preference(getMpClient());
}

export function getMpPayment() {
  return new Payment(getMpClient());
}

export interface CreatePreferenceParams {
  appointmentId: string;
  serviceName: string;
  price: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  expiresAt: Date;
}

/**
 * Genera una preferencia en Mercado Pago Checkout Pro sincronizada con la expiración del turno (10 min)
 */
export async function createCheckoutPreference({
  appointmentId,
  serviceName,
  price,
  customerName,
  customerPhone,
  customerEmail,
  expiresAt,
}: CreatePreferenceParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const preferenceInstance = getMpPreference();
    const preference = await preferenceInstance.create({
      body: {
        items: [
          {
            id: appointmentId,
            title: `Turno: ${serviceName} - Diogo Barber Shop`,
            quantity: 1,
            unit_price: price,
            currency_id: 'ARS',
          },
        ],
        payer: {
          name: customerName,
          phone: {
            number: customerPhone,
          },
          email: customerEmail || 'cliente@diogobarber.com',
        },
        back_urls: {
          success: `${appUrl}/confirmacion?appointmentId=${appointmentId}&status=approved`,
          failure: `${appUrl}/confirmacion?appointmentId=${appointmentId}&status=failure`,
          pending: `${appUrl}/confirmacion?appointmentId=${appointmentId}&status=pending`,
        },
        ...(appUrl.startsWith('https://') ? { auto_return: 'approved' } : {}),
        external_reference: appointmentId,
        date_of_expiration: expiresAt.toISOString(),
        ...(appUrl.startsWith('https://')
          ? { notification_url: `${appUrl}/api/webhooks/mercadopago` }
          : {}),
        statement_descriptor: 'DIOGO BARBER',
      },
    });

    // En desarrollo local priorizamos sandbox_init_point para aceptar tarjetas de prueba sin fricción
    const isDev = process.env.NODE_ENV !== 'production';
    const initPoint =
      isDev && preference.sandbox_init_point
        ? preference.sandbox_init_point
        : preference.init_point || preference.sandbox_init_point;

    return {
      preferenceId: preference.id,
      initPoint,
    };
  } catch (error) {
    console.error('Error al generar preferencia en Mercado Pago:', error);
    throw error;
  }
}

/**
 * Valida la firma criptográfica x-signature enviada por Mercado Pago en Webhooks
 * Previene ataques de falsificación de webhooks con comparación en tiempo constante (HMAC-SHA256).
 */
export function verifyMercadoPagoSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  const secret =
    process.env.MERCADOPAGO_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET;

  if (!secret) {
    // En producción es obligatorio tener el secret configurado (fail-closed)
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'Seguridad: MERCADOPAGO_WEBHOOK_SECRET no configurado en producción.'
      );
      return false;
    }
    return true;
  }

  if (!xSignature || !xRequestId || !dataId) {
    return false;
  }

  try {
    // xSignature format: ts=123456789,v1=abcdef...
    const parts = xSignature.split(',');
    let ts = '';
    let hash = '';

    for (const part of parts) {
      const [key, val] = part.split('=');
      if (key?.trim() === 'ts') ts = val?.trim();
      if (key?.trim() === 'v1') hash = val?.trim();
    }

    if (!ts || !hash) return false;

    // Crear la plantilla de verificación según la documentación oficial de Mercado Pago
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const computedHmac = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    const bufComputed = Buffer.from(computedHmac, 'utf8');
    const bufProvided = Buffer.from(hash, 'utf8');

    if (bufComputed.length !== bufProvided.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufComputed, bufProvided);
  } catch (err) {
    console.error('Error al validar x-signature de Mercado Pago:', err);
    return false;
  }
}

/**
 * Consulta a Mercado Pago sobre todos los turnos en estado PENDING_PAYMENT
 * y reconcilia automáticamente si el pago ya fue aprobado o rechazado.
 */
export async function syncPendingAppointments() {
  try {
    const pendingList = await db
      .select({
        id: appointments.id,
        price: appointments.price,
        customerName: appointments.customerName,
        expiresAt: appointments.expiresAt,
        serviceName: services.name,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.status, 'PENDING_PAYMENT'));

    if (pendingList.length === 0) return;

    const mpPayment = getMpPayment();

    for (const app of pendingList) {
      try {
        const searchResult = await mpPayment.search({
          options: {
            external_reference: app.id,
          },
        });

        const latestPayment = searchResult.results?.[0];

        if (latestPayment && latestPayment.status === 'approved') {
          // 1. Confirmar el turno
          await db
            .update(appointments)
            .set({
              status: 'CONFIRMED',
              paymentStatus: 'APPROVED',
              expiresAt: null,
              mpPaymentId: String(latestPayment.id),
              updatedAt: new Date(),
            })
            .where(eq(appointments.id, app.id));

          // 2. Registrar ingreso en caja (idempotente)
          const existingTx = await db
            .select()
            .from(cashTransactions)
            .where(eq(cashTransactions.appointmentId, app.id))
            .limit(1);

          if (existingTx.length === 0) {
            await db.insert(cashTransactions).values({
              type: 'INCOME',
              category: 'APPOINTMENT',
              amount: app.price,
              paymentMethod: 'MERCADOPAGO',
              description: `Cobro online turno - ${app.customerName} (${app.serviceName || 'Servicio'})`,
              appointmentId: app.id,
              transactionDate: new Date(),
            });
          }

          console.log(`✅ Auto-reconciliado turno ${app.id} a CONFIRMED (Pago #${latestPayment.id})`);
        } else if (
          latestPayment &&
          (latestPayment.status === 'rejected' || latestPayment.status === 'cancelled')
        ) {
          await db
            .update(appointments)
            .set({
              status: 'CANCELLED',
              paymentStatus: 'REJECTED',
              cancellationReason: `Pago Mercado Pago ${latestPayment.status}`,
              updatedAt: new Date(),
            })
            .where(eq(appointments.id, app.id));
        } else if (app.expiresAt && new Date(app.expiresAt) < new Date()) {
          // Si vencieron los 10 min de bloqueo y no hay pago registrado, cancelar turno
          await db
            .update(appointments)
            .set({
              status: 'CANCELLED',
              cancellationReason: 'Tiempo de pago expirado (10 min)',
              updatedAt: new Date(),
            })
            .where(eq(appointments.id, app.id));
        }
      } catch (itemErr) {
        // Ignorar errores puntuales de conexión de un turno para no interrumpir el resto
        console.warn(`Aviso al reconciliar turno ${app.id}:`, itemErr);
      }
    }
  } catch (error) {
    console.error('Error general en syncPendingAppointments:', error);
  }
}
