'use server';

import { db } from '@/db';
import { revalidatePath } from 'next/cache';
import { appointments, services } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAvailableSlots, parseDateTime, type TimeSlot } from '@/utils/availability';
import { createCheckoutPreference } from '@/utils/mercadopago';

export interface CreateBookingInput {
  serviceId: string;
  dateStr: string; // "YYYY-MM-DD"
  timeStr: string; // "10:00"
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
 * Server Action para crear la reserva pública con bloqueo de 10 min y Checkout Pro
 */
export async function createBookingAction(
  input: CreateBookingInput
): Promise<BookingResult> {
  const { serviceId, dateStr, timeStr, customerName, customerPhone, customerNotes } =
    input;

  // 1. Validaciones básicas de entrada
  if (!serviceId || !dateStr || !timeStr || !customerName.trim() || !customerPhone.trim()) {
    return {
      success: false,
      error: 'Por favor, completá todos los campos obligatorios.',
    };
  }

  try {
    // 2. Obtener el servicio
    const serviceList = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.active, true)))
      .limit(1);

    const service = serviceList[0];
    if (!service) {
      return { success: false, error: 'El servicio seleccionado no está disponible.' };
    }

    // 3. Verificar disponibilidad en tiempo real (evitar doble reserva concurrente)
    const availableSlots = await getAvailableSlots(serviceId, dateStr);
    const selectedSlot = availableSlots.find((s) => s.time === timeStr);

    if (!selectedSlot || !selectedSlot.available) {
      return {
        success: false,
        error:
          'El horario seleccionado ya no se encuentra disponible. Por favor, elegí otro hueco.',
      };
    }

    const startTime = parseDateTime(dateStr, timeStr);
    const endTime = new Date(
      startTime.getTime() + service.durationMinutes * 60 * 1000
    );

    // 4. Establecer el bloqueo temporal de 10 minutos anti-colisión
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    // 5. Insertar turno en estado PENDING_PAYMENT
    const insertedAppointments = await db
      .insert(appointments)
      .values({
        serviceId: service.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNotes: customerNotes?.trim() || null,
        startTime,
        endTime,
        status: 'PENDING_PAYMENT',
        expiresAt,
        price: service.price,
        paymentMethod: 'MERCADOPAGO',
        paymentStatus: 'PENDING',
      })
      .returning();

    const appointment = insertedAppointments[0];

    // 6. Generar preferencia en Mercado Pago Checkout Pro
    let preferenceResult: { preferenceId?: string; initPoint?: string } = {};

    try {
      preferenceResult = await createCheckoutPreference({
        appointmentId: appointment.id,
        serviceName: service.name,
        price: Number(service.price),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        expiresAt,
      });

      // Guardar el preferenceId retornado por Mercado Pago
      if (preferenceResult.preferenceId) {
        await db
          .update(appointments)
          .set({
            mpPreferenceId: preferenceResult.preferenceId,
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, appointment.id));
      }
    } catch (mpError) {
      console.warn(
        'Aviso: Mercado Pago no devolvió preferencia en vivo (credencial demo o offline). Procediendo con fallback mock para testing local.',
        mpError
      );
      // Fallback para testing local: redirigir a la pantalla interactiva del simulador
      preferenceResult = {
        preferenceId: `mock-pref-${appointment.id}`,
        initPoint: `/checkout-simulator?appointmentId=${appointment.id}`,
      };
    }

    revalidatePath('/dashboard');
    revalidatePath('/reservar');

    return {
      success: true,
      appointmentId: appointment.id,
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
