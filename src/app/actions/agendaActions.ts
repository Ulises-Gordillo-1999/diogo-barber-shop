'use server';

import { db } from '@/db';
import { appointments, cashTransactions, services } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/utils/auth';
import { getAvailableSlots, parseDateTime } from '@/utils/availability';
import { revalidatePath } from 'next/cache';

export interface RescheduleInput {
  appointmentId: string;
  newDateStr: string; // "YYYY-MM-DD"
  newTimeStr: string; // "15:00"
}

export interface ManualAppointmentInput {
  serviceId: string;
  customerName: string;
  customerPhone: string;
  dateStr: string;
  timeStr: string;
  paymentMethod: 'CASH' | 'TRANSFER' | 'MERCADOPAGO';
  isPaid: boolean;
  customerNotes?: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Server Action para reprogramar un turno existente a una nueva fecha y hora
 */
export async function rescheduleAppointmentAction(
  input: RescheduleInput
): Promise<ActionResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { success: false, error: 'No autorizado. Iniciá sesión nuevamente.' };
  }

  const { appointmentId, newDateStr, newTimeStr } = input;
  if (!appointmentId || !newDateStr || !newTimeStr) {
    return { success: false, error: 'Datos de reprogramación incompletos.' };
  }

  try {
    const appointmentList = await db
      .select({
        appointment: appointments,
        service: services,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    const record = appointmentList[0];
    if (!record || !record.service) {
      return { success: false, error: 'Turno no encontrado.' };
    }

    // Verificar disponibilidad en el nuevo horario
    const availableSlots = await getAvailableSlots(record.service.id, newDateStr);
    const targetSlot = availableSlots.find((s) => s.time === newTimeStr);

    if (!targetSlot || !targetSlot.available) {
      return {
        success: false,
        error: 'El horario seleccionado ya no está disponible. Elegí otro.',
      };
    }

    const newStartTime = parseDateTime(newDateStr, newTimeStr);
    const newEndTime = new Date(
      newStartTime.getTime() + record.service.durationMinutes * 60 * 1000
    );

    await db
      .update(appointments)
      .set({
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'RESCHEDULED',
        rescheduledFromId: record.appointment.id,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    revalidatePath('/dashboard');
    return { success: true, message: 'Turno reprogramado exitosamente.' };
  } catch (error) {
    console.error('Error al reprogramar turno:', error);
    return { success: false, error: 'Error al reprogramar el turno.' };
  }
}

/**
 * Server Action para cambiar el estado de un turno (COMPLETED, CANCELLED, NO_SHOW)
 */
export async function updateAppointmentStatusAction(
  appointmentId: string,
  newStatus: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
): Promise<ActionResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { success: false, error: 'No autorizado.' };
  }

  try {
    await db
      .update(appointments)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    return { success: false, error: 'No se pudo actualizar el estado.' };
  }
}

/**
 * Server Action para cargar un turno de forma manual / presencial desde el panel
 */
export async function createManualAppointmentAction(
  input: ManualAppointmentInput
): Promise<ActionResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { success: false, error: 'No autorizado.' };
  }

  const {
    serviceId,
    customerName,
    customerPhone,
    dateStr,
    timeStr,
    paymentMethod,
    isPaid,
    customerNotes,
  } = input;

  if (!serviceId || !customerName.trim() || !customerPhone.trim() || !dateStr || !timeStr) {
    return { success: false, error: 'Completá todos los campos requeridos.' };
  }

  try {
    const serviceList = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    const service = serviceList[0];
    if (!service) {
      return { success: false, error: 'Servicio no encontrado.' };
    }

    const startTime = parseDateTime(dateStr, timeStr);
    const endTime = new Date(
      startTime.getTime() + service.durationMinutes * 60 * 1000
    );

    // 1. Insertar turno como CONFIRMED
    const inserted = await db
      .insert(appointments)
      .values({
        serviceId: service.id,
        barberId: sessionUser.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNotes: customerNotes?.trim() || null,
        startTime,
        endTime,
        status: 'CONFIRMED',
        price: service.price,
        paymentMethod,
        paymentStatus: isPaid ? 'APPROVED' : 'PENDING',
      })
      .returning();

    const newAppointment = inserted[0];

    // 2. Si el pago ya fue efectuado en el local (Efectivo o Transferencia), registrar en caja
    if (isPaid) {
      await db.insert(cashTransactions).values({
        type: 'INCOME',
        category: 'APPOINTMENT',
        amount: service.price,
        paymentMethod,
        description: `Cobro turno presencial - ${customerName.trim()} (${service.name})`,
        appointmentId: newAppointment.id,
        userId: sessionUser.id,
        transactionDate: new Date(),
      });
    }

    revalidatePath('/dashboard');
    return { success: true, message: 'Turno agendado exitosamente.' };
  } catch (error) {
    console.error('Error al crear turno manual:', error);
    return { success: false, error: 'Error al registrar el turno.' };
  }
}
