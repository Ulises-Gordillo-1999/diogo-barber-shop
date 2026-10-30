'use server';

import { db } from '@/db';
import { revalidatePath } from 'next/cache';
import { appointments, products, services } from '@/db/schema';
import { ensureExtendedSchema } from '@/db/ensureSchema';
import { eq, and, inArray } from 'drizzle-orm';
import { getAvailableSlots, parseDateTime, type TimeSlot } from '@/utils/availability';
import { createCheckoutPreference, type MpLineItem } from '@/utils/mercadopago';
import { validateMultiSlotCart } from '@/utils/dateHelpers';

export interface CreateBookingInput {
  serviceId: string;
  dateStr: string; // "YYYY-MM-DD" (primer turno o turno único)
  timeStr: string; // "10:00"
  additionalSlots?: Array<{
    dateStr: string;
    timeStr: string;
    label?: string;
  }>;
  attachedProducts?: Array<{
    productId: string;
    quantity: number;
  }>;
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
}

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  initPoint?: string;
  error?: string;
}

/**
 * Server Action para consultar horarios libres disponibles
 */
export async function fetchAvailableSlotsAction(
  serviceId: string,
  dateStr: string
): Promise<TimeSlot[]> {
  try {
    return await getAvailableSlots(serviceId, dateStr);
  } catch (err) {
    console.error('Error en fetchAvailableSlotsAction:', err);
    return [];
  }
}

/**
 * Server Action para crear la reserva pública (individual o múltiple para amigos/mes)
 * más productos sugeridos (upselling), con bloqueo de 10 min y Checkout Pro.
 */
export async function createBookingAction(
  input: CreateBookingInput
): Promise<BookingResult> {
  await ensureExtendedSchema();

  const {
    serviceId,
    dateStr,
    timeStr,
    additionalSlots = [],
    attachedProducts = [],
    customerName,
    customerPhone,
    customerNotes,
  } = input;

  if (!serviceId || !dateStr || !timeStr || !customerName.trim() || !customerPhone.trim()) {
    return {
      success: false,
      error: 'Por favor, completá todos los campos obligatorios.',
    };
  }

  try {
    // 1. Obtener el servicio
    const serviceList = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.active, true)))
      .limit(1);

    const service = serviceList[0];
    if (!service) {
      return { success: false, error: 'El servicio seleccionado no está disponible.' };
    }

    // 2. Construir lista unificada de turnos a reservar
    const allRequestedSlots = [
      { dateStr, timeStr, label: 'Turno Principal' },
      ...additionalSlots,
    ];

    // 3. Validar productos sugeridos agregados (si existen)
    const verifiedProducts: Array<{
      productId: string;
      name: string;
      unitPrice: number;
      quantity: number;
    }> = [];

    if (attachedProducts.length > 0) {
      const prodIds = attachedProducts.map((p) => p.productId);
      const dbProducts = await db
        .select()
        .from(products)
        .where(inArray(products.id, prodIds));

      for (const reqProd of attachedProducts) {
        const found = dbProducts.find((p) => p.id === reqProd.productId && p.active);
        if (!found) continue;
        const qty = Math.max(1, Math.min(found.stock, Math.floor(Number(reqProd.quantity) || 1)));
        if (qty <= 0) continue;
        verifiedProducts.push({
          productId: found.id,
          name: found.name,
          unitPrice: Number(found.price),
          quantity: qty,
        });
      }
    }

    // 4. Validar no duplicación en el mismo carrito
    const cartValidation = validateMultiSlotCart(
      allRequestedSlots,
      Number(service.price),
      verifiedProducts
    );

    if (!cartValidation.valid) {
      return { success: false, error: cartValidation.error };
    }

    // 5. Verificar disponibilidad en tiempo real de CADA horario solicitado
    for (const slotReq of allRequestedSlots) {
      const availableSlots = await getAvailableSlots(serviceId, slotReq.dateStr);
      const selectedSlot = availableSlots.find((s) => s.time === slotReq.timeStr);

      if (!selectedSlot || !selectedSlot.available) {
        return {
          success: false,
          error: `El horario ${slotReq.dateStr} a las ${slotReq.timeStr} hs ya no está disponible. Por favor elegí otro hueco.`,
        };
      }
    }

    // 6. Establecer el bloqueo temporal de 10 minutos anti-colisión
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    // 7. Insertar el primer turno para obtener el ID maestro (groupBookingId)
    const firstSlot = allRequestedSlots[0];
    const firstStart = parseDateTime(firstSlot.dateStr, firstSlot.timeStr);
    const firstEnd = new Date(
      firstStart.getTime() + service.durationMinutes * 60 * 1000
    );

    const [primaryAppointment] = await db
      .insert(appointments)
      .values({
        serviceId: service.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNotes:
          allRequestedSlots.length > 1
            ? `[Reserva Múltiple: 1/${allRequestedSlots.length}] ${customerNotes?.trim() || ''}`.trim()
            : customerNotes?.trim() || null,
        startTime: firstStart,
        endTime: firstEnd,
        status: 'PENDING_PAYMENT',
        expiresAt,
        price: service.price,
        paymentMethod: 'MERCADOPAGO',
        paymentStatus: 'PENDING',
        attachedProductsJson:
          verifiedProducts.length > 0 ? JSON.stringify(verifiedProducts) : null,
      })
      .returning();

    // Actualizar su groupBookingId a su propio ID
    await db
      .update(appointments)
      .set({ groupBookingId: primaryAppointment.id })
      .where(eq(appointments.id, primaryAppointment.id));

    // 8. Si hay turnos adicionales (amigo o pack mensual), insertarlos vinculados al mismo groupBookingId
    if (allRequestedSlots.length > 1) {
      for (let i = 1; i < allRequestedSlots.length; i++) {
        const extra = allRequestedSlots[i];
        const sTime = parseDateTime(extra.dateStr, extra.timeStr);
        const eTime = new Date(
          sTime.getTime() + service.durationMinutes * 60 * 1000
        );

        await db.insert(appointments).values({
          serviceId: service.id,
          customerName: extra.label
            ? `${customerName.trim()} (${extra.label})`
            : customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerNotes: `[Reserva Múltiple: ${i + 1}/${allRequestedSlots.length}] ${
            customerNotes?.trim() || ''
          }`.trim(),
          startTime: sTime,
          endTime: eTime,
          status: 'PENDING_PAYMENT',
          expiresAt,
          price: service.price,
          paymentMethod: 'MERCADOPAGO',
          paymentStatus: 'PENDING',
          groupBookingId: primaryAppointment.id,
        });
      }
    }

    // 9. Generar preferencia en Mercado Pago Checkout Pro
    const extraMpItems: MpLineItem[] = verifiedProducts.map((p) => ({
      id: p.productId,
      title: p.name,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
    }));

    let preferenceResult: { preferenceId?: string; initPoint?: string } = {};

    try {
      preferenceResult = await createCheckoutPreference({
        appointmentId: primaryAppointment.id,
        serviceName: service.name,
        price: Number(service.price),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        expiresAt,
        slotsCount: allRequestedSlots.length,
        extraItems: extraMpItems,
      });

      if (preferenceResult.preferenceId) {
        await db
          .update(appointments)
          .set({
            mpPreferenceId: preferenceResult.preferenceId,
            updatedAt: new Date(),
          })
          .where(eq(appointments.groupBookingId, primaryAppointment.id));
      }
    } catch (mpError) {
      console.warn(
        'Aviso: Mercado Pago no devolvió preferencia en vivo. Procediendo con fallback mock para testing local.',
        mpError
      );
      preferenceResult = {
        preferenceId: `mock-pref-${primaryAppointment.id}`,
        initPoint: `/checkout-simulator?appointmentId=${primaryAppointment.id}`,
      };
    }

    revalidatePath('/dashboard');
    revalidatePath('/reservar');

    return {
      success: true,
      appointmentId: primaryAppointment.id,
      initPoint: preferenceResult.initPoint,
    };
  } catch (error) {
    console.error('Error al procesar reserva:', error);
    return {
      success: false,
      error: 'Ocurrió un error al procesar tu turno. Intentá nuevamente.',
    };
  }
}
