import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import crypto from 'crypto';
import { db } from '@/db';
import {
  appointments,
  cashTransactions,
  productOrders,
  products,
  services,
} from '@/db/schema';
import { ensureExtendedSchema } from '@/db/ensureSchema';
import { eq, or, sql } from 'drizzle-orm';

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

export interface MpLineItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePreferenceParams {
  appointmentId: string;
  serviceName: string;
  price: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  expiresAt: Date;
  extraItems?: MpLineItem[];
  slotsCount?: number;
}

/**
 * Genera una preferencia en Mercado Pago Checkout Pro sincronizada con la expiración del turno (10 min).
 * Soporta turnos individuales, multi-turnos (amigos / pack mensual) y productos sugeridos agregados al turno.
 */
export async function createCheckoutPreference({
  appointmentId,
  serviceName,
  price,
  customerName,
  customerPhone,
  customerEmail,
  expiresAt,
  extraItems = [],
  slotsCount = 1,
}: CreatePreferenceParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const preferenceInstance = getMpPreference();
    const items = [
      {
        id: appointmentId,
        title:
          slotsCount > 1
            ? `Reserva de ${slotsCount} Turnos: ${serviceName} - Diogo Barber Shop`
            : `Turno: ${serviceName} - Diogo Barber Shop`,
        quantity: slotsCount,
        unit_price: price,
        currency_id: 'ARS',
      },
      ...extraItems.map((item) => ({
        id: item.id,
        title: `Producto: ${item.title} - Diogo Barber Shop`,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: 'ARS',
      })),
    ];

    const preference = await preferenceInstance.create({
      body: {
        items,
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

export interface CreateOrderPreferenceParams {
  orderId: string;
  customerName: string;
  customerPhone: string;
  items: MpLineItem[];
  shippingZoneName?: string;
  shippingCost?: number;
}

/**
 * Genera una preferencia de Mercado Pago para compras de productos en la Tienda Online (/tienda),
 * incluyendo el ítem del cadete cuando el cliente elige envío a domicilio.
 */
export async function createProductOrderPreference({
  orderId,
  customerName,
  customerPhone,
  items,
  shippingZoneName,
  shippingCost = 0,
}: CreateOrderPreferenceParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const preferenceInstance = getMpPreference();

  const mpItems = items.map((item) => ({
    id: item.id,
    title: `${item.title} - Diogo Barber Shop`,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    currency_id: 'ARS',
  }));

  if (shippingCost > 0) {
    mpItems.push({
      id: `shipping-${orderId}`,
      title: `Envío por Cadete (${shippingZoneName || 'Catamarca y alrededores'})`,
      quantity: 1,
      unit_price: shippingCost,
      currency_id: 'ARS',
    });
  }

  const preference = await preferenceInstance.create({
    body: {
      items: mpItems,
      payer: {
        name: customerName,
        phone: {
          number: customerPhone,
        },
        email: 'cliente@diogobarber.com',
      },
      back_urls: {
        success: `${appUrl}/confirmacion?orderId=${orderId}&status=approved`,
        failure: `${appUrl}/confirmacion?orderId=${orderId}&status=failure`,
        pending: `${appUrl}/confirmacion?orderId=${orderId}&status=pending`,
      },
      ...(appUrl.startsWith('https://') ? { auto_return: 'approved' } : {}),
      external_reference: `ORDER:${orderId}`,
      ...(appUrl.startsWith('https://')
        ? { notification_url: `${appUrl}/api/webhooks/mercadopago` }
        : {}),
      statement_descriptor: 'DIOGO BARBER',
    },
  });

  const isDev = process.env.NODE_ENV !== 'production';
  const initPoint =
    isDev && preference.sandbox_init_point
      ? preference.sandbox_init_point
      : preference.init_point || preference.sandbox_init_point;

  return {
    preferenceId: preference.id,
    initPoint,
  };
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
    const parts = xSignature.split(',');
    let ts = '';
    let hash = '';

    for (const part of parts) {
      const [key, val] = part.split('=');
      if (key?.trim() === 'ts') ts = val?.trim();
      if (key?.trim() === 'v1') hash = val?.trim();
    }

    if (!ts || !hash) return false;

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
 * Confirma un turno (o grupo de turnos si fue multi-reserva) y sus productos adjuntos,
 * registrando en Caja los ingresos discriminados de forma 100% idempotente.
 */
export async function confirmAppointmentGroupAndProducts(
  primaryAppointmentId: string,
  mpPaymentId: string
): Promise<boolean> {
  await ensureExtendedSchema();

  const groupRows = await db
    .select({
      appointment: appointments,
      service: services,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(
      or(
        eq(appointments.id, primaryAppointmentId),
        eq(appointments.groupBookingId, primaryAppointmentId)
      )
    );

  if (groupRows.length === 0) return false;

  for (const row of groupRows) {
    const { appointment, service } = row;
    const wasAlreadyConfirmed = appointment.status === 'CONFIRMED';

    if (!wasAlreadyConfirmed) {
      await db
        .update(appointments)
        .set({
          status: 'CONFIRMED',
          paymentStatus: 'APPROVED',
          expiresAt: null,
          mpPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointment.id));
    }

    // Registrar ingreso del turno en caja (idempotente)
    const existingTx = await db
      .select()
      .from(cashTransactions)
      .where(eq(cashTransactions.appointmentId, appointment.id))
      .limit(1);

    if (existingTx.length === 0) {
      await db.insert(cashTransactions).values({
        type: 'INCOME',
        category: 'APPOINTMENT',
        amount: appointment.price,
        paymentMethod: 'MERCADOPAGO',
        description: `Cobro online turno - ${appointment.customerName} (${service?.name || 'Servicio'})`,
        appointmentId: appointment.id,
        transactionDate: new Date(),
      });
    }

    // Si el turno principal tenía productos sugeridos adjuntos (upselling), descontar stock y registrar en Caja
    if (
      appointment.id === primaryAppointmentId &&
      appointment.attachedProductsJson &&
      !wasAlreadyConfirmed
    ) {
      try {
        const attached = JSON.parse(appointment.attachedProductsJson) as Array<{
          productId: string;
          name: string;
          unitPrice: number;
          quantity: number;
        }>;

        if (Array.isArray(attached) && attached.length > 0) {
          let totalProductsAmount = 0;
          const summaryNames: string[] = [];

          for (const item of attached) {
            const qty = Math.max(1, Number(item.quantity) || 1);
            const unit = Math.max(0, Number(item.unitPrice) || 0);
            totalProductsAmount += unit * qty;
            summaryNames.push(`${qty}x ${item.name}`);

            await db
              .update(products)
              .set({
                stock: sql`GREATEST(0, ${products.stock} - ${qty})`,
                updatedAt: new Date(),
              })
              .where(eq(products.id, item.productId));
          }

          if (totalProductsAmount > 0) {
            await db.insert(cashTransactions).values({
              type: 'INCOME',
              category: 'PRODUCT_SALE',
              amount: totalProductsAmount.toFixed(2),
              paymentMethod: 'MERCADOPAGO',
              description: `Productos sumados al turno (${summaryNames.join(', ')}) - ${appointment.customerName}`,
              transactionDate: new Date(),
            });
          }
        }
      } catch (e) {
        console.error('Error procesando productos adjuntos al turno:', e);
      }
    }
  }

  return true;
}

/**
 * Confirma una orden de compra de la Tienda Online (/tienda), descuenta stock e
 * impacta en Caja únicamente el subtotal de productos (excluyendo el envío del cadete).
 */
export async function confirmProductOrderPayment(
  orderId: string,
  mpPaymentId: string
): Promise<boolean> {
  await ensureExtendedSchema();

  const orderRows = await db
    .select()
    .from(productOrders)
    .where(eq(productOrders.id, orderId))
    .limit(1);

  const order = orderRows[0];
  if (!order) return false;

  if (order.paymentStatus === 'APPROVED') {
    return true; // Ya acreditado previamente (idempotencia)
  }

  await db
    .update(productOrders)
    .set({
      status: 'PAID',
      paymentStatus: 'APPROVED',
      mpPaymentId,
      updatedAt: new Date(),
    })
    .where(eq(productOrders.id, order.id));

  // Descontar stock de cada producto comprado
  let itemNames = 'Productos de Barbería';
  try {
    const parsedItems = JSON.parse(order.itemsJson) as Array<{
      productId: string;
      name: string;
      unitPrice: number;
      quantity: number;
    }>;

    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
      itemNames = parsedItems.map((i) => `${i.quantity}x ${i.name}`).join(', ');
      for (const item of parsedItems) {
        const qty = Math.max(1, Number(item.quantity) || 1);
        await db
          .update(products)
          .set({
            stock: sql`GREATEST(0, ${products.stock} - ${qty})`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
      }
    }
  } catch (e) {
    console.error('Error descontando stock de orden:', e);
  }

  // Registrar en Caja ÚNICAMENTE el valor de los productos (excluyendo lo del cadete)
  const deliveryNote =
    order.deliveryType === 'COURIER'
      ? ` [Envío Cadete ${order.shippingZoneName || ''}: $${Number(order.shippingCost).toLocaleString('es-AR')} aparte]`
      : ' [Retiro en Barbería]';

  await db.insert(cashTransactions).values({
    type: 'INCOME',
    category: 'PRODUCT_SALE',
    amount: order.productsSubtotal,
    paymentMethod: 'MERCADOPAGO',
    description: `Venta Tienda Online (${itemNames}) - ${order.customerName}${deliveryNote}`,
    transactionDate: new Date(),
  });

  return true;
}

/**
 * Consulta a Mercado Pago sobre todos los turnos y órdenes de tienda en estado PENDING_PAYMENT
 * y reconcilia automáticamente si el pago ya fue aprobado o rechazado.
 */
export async function syncPendingAppointments() {
  try {
    await ensureExtendedSchema();
    const mpPayment = getMpPayment();

    // 1. Reconciliar turnos pendientes
    const pendingList = await db
      .select({
        id: appointments.id,
        expiresAt: appointments.expiresAt,
        groupBookingId: appointments.groupBookingId,
      })
      .from(appointments)
      .where(eq(appointments.status, 'PENDING_PAYMENT'));

    for (const app of pendingList) {
      try {
        const refId = app.groupBookingId || app.id;
        const searchResult = await mpPayment.search({
          options: {
            external_reference: refId,
          },
        });

        const latestPayment = searchResult.results?.[0];

        if (latestPayment && latestPayment.status === 'approved') {
          await confirmAppointmentGroupAndProducts(refId, String(latestPayment.id));
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
        console.warn(`Aviso al reconciliar turno ${app.id}:`, itemErr);
      }
    }

    // 2. Reconciliar órdenes de tienda pendientes
    const pendingOrders = await db
      .select({ id: productOrders.id })
      .from(productOrders)
      .where(eq(productOrders.status, 'PENDING_PAYMENT'));

    for (const ord of pendingOrders) {
      try {
        const searchResult = await mpPayment.search({
          options: {
            external_reference: `ORDER:${ord.id}`,
          },
        });

        const latestPayment = searchResult.results?.[0];
        if (latestPayment && latestPayment.status === 'approved') {
          await confirmProductOrderPayment(ord.id, String(latestPayment.id));
        } else if (
          latestPayment &&
          (latestPayment.status === 'rejected' || latestPayment.status === 'cancelled')
        ) {
          await db
            .update(productOrders)
            .set({
              status: 'CANCELLED',
              paymentStatus: 'REJECTED',
              updatedAt: new Date(),
            })
            .where(eq(productOrders.id, ord.id));
        }
      } catch (ordErr) {
        console.warn(`Aviso al reconciliar orden ${ord.id}:`, ordErr);
      }
    }
  } catch (error) {
    console.error('Error general en syncPendingAppointments:', error);
  }
}
