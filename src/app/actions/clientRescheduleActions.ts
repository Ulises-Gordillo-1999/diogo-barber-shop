'use server';

import { db } from '@/db';
import { appointments, businessHours, services } from '@/db/schema';
import { eq, and, inArray, gte, asc } from 'drizzle-orm';
import { getSessionUser } from '@/utils/auth';
import { getAvailableSlots, parseDateTime } from '@/utils/availability';
import { revalidatePath } from 'next/cache';

// Usamos dayOfWeek = -1 en business_hours para persistir la política de reprogramación
// sin requerir migraciones destructivas en el cluster PostgreSQL de producción.
const POLICY_DAY_MARKER = -1;
const DEFAULT_MIN_HOURS = 2;

export interface ReschedulePolicy {
  enabled: boolean;
  minHoursBefore: number;
}

/**
 * Obtiene la política actual de reprogramación configurada por el administrador (por defecto: 2 horas antes)
 */
export async function getReschedulePolicy(): Promise<ReschedulePolicy> {
  try {
    const rows = await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.dayOfWeek, POLICY_DAY_MARKER))
      .limit(1);

    if (!rows[0]) {
      return {
        enabled: true,
        minHoursBefore: DEFAULT_MIN_HOURS,
      };
    }

    const parsedHours = parseInt(rows[0].openTime, 10);
    return {
      enabled: rows[0].isOpen,
      minHoursBefore:
        !Number.isNaN(parsedHours) && parsedHours >= 0
          ? parsedHours
          : DEFAULT_MIN_HOURS,
    };
  } catch (err) {
    console.error('Error al leer política de reprogramación:', err);
    return {
      enabled: true,
      minHoursBefore: DEFAULT_MIN_HOURS,
    };
  }
}

/**
 * Permite al Administrador modificar cuántas horas antes puede reprogramar un cliente
 */
export async function updateReschedulePolicyAction(input: {
  enabled: boolean;
  minHoursBefore: number;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return {
      success: false,
      error: 'Solo el administrador puede modificar la política de reprogramación.',
    };
  }

  const cleanHours = Math.max(0, Math.min(72, Math.round(input.minHoursBefore)));

  try {
    const existing = await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.dayOfWeek, POLICY_DAY_MARKER))
      .limit(1);

    if (existing[0]) {
      await db
        .update(businessHours)
        .set({
          isOpen: input.enabled,
          openTime: String(cleanHours),
          closeTime: '00:00',
          updatedAt: new Date(),
        })
        .where(eq(businessHours.dayOfWeek, POLICY_DAY_MARKER));
    } else {
      await db.insert(businessHours).values({
        dayOfWeek: POLICY_DAY_MARKER,
        isOpen: input.enabled,
        openTime: String(cleanHours),
        closeTime: '00:00',
        hasBreak: false,
      });
    }

    revalidatePath('/dashboard/horarios');
    revalidatePath('/confirmacion');
    revalidatePath('/mi-turno');
    revalidatePath('/reservar');

    return {
      success: true,
      message: 'Política de reprogramación actualizada correctamente.',
    };
  } catch (err) {
    console.error('Error guardando política de reprogramación:', err);
    return {
      success: false,
      error: 'No se pudo guardar la configuración.',
    };
  }
}

export interface ClientAppointmentDTO {
  id: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'RESCHEDULED';
  price: string;
  canRescheduleNow: boolean;
  hoursRemaining: number;
  alreadyRescheduledOnce: boolean;
}

/**
 * Normaliza un número de teléfono dejando únicamente los últimos 8 dígitos significativos
 * para que coincida aunque el cliente escriba con o sin +54, 9, 0 o 15.
 */
function normalizePhoneTail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-8) : digits;
}

/**
 * Busca turnos futuros pagados (CONFIRMED o RESCHEDULED) por teléfono de WhatsApp o ID de turno
 */
export async function lookupClientAppointmentsAction(input: {
  phone?: string;
  appointmentId?: string;
}): Promise<{
  success: boolean;
  appointments: ClientAppointmentDTO[];
  policy: ReschedulePolicy;
  error?: string;
}> {
  const policy = await getReschedulePolicy();
  const now = new Date();

  try {
    const rawList = await db
      .select({
        id: appointments.id,
        serviceId: appointments.serviceId,
        serviceName: services.name,
        durationMinutes: services.durationMinutes,
        customerName: appointments.customerName,
        customerPhone: appointments.customerPhone,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        price: appointments.price,
        rescheduledFromId: appointments.rescheduledFromId,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          inArray(appointments.status, ['CONFIRMED', 'RESCHEDULED']),
          gte(appointments.startTime, new Date(now.getTime() - 2 * 60 * 60 * 1000))
        )
      )
      .orderBy(asc(appointments.startTime));

    let matched = rawList;

    if (input.appointmentId && input.appointmentId.trim()) {
      matched = rawList.filter((a) => a.id === input.appointmentId?.trim());
    } else if (input.phone && input.phone.trim()) {
      const searchTail = normalizePhoneTail(input.phone);
      if (searchTail.length < 6) {
        return {
          success: false,
          appointments: [],
          policy,
          error: 'Ingresá un número de WhatsApp válido (al menos 8 dígitos).',
        };
      }
      matched = rawList.filter(
        (a) => normalizePhoneTail(a.customerPhone) === searchTail
      );
    } else {
      return {
        success: false,
        appointments: [],
        policy,
        error: 'Ingresá tu número de WhatsApp para buscar tu turno.',
      };
    }

    const mapped: ClientAppointmentDTO[] = matched.map((a) => {
      const startMs = new Date(a.startTime).getTime();
      const diffHours = (startMs - now.getTime()) / (1000 * 60 * 60);
      const canRescheduleNow =
        policy.enabled && diffHours >= policy.minHoursBefore;

      return {
        id: a.id,
        serviceId: a.serviceId,
        serviceName: a.serviceName || 'Servicio de Barbería',
        durationMinutes: a.durationMinutes || 30,
        customerName: a.customerName,
        customerPhone: a.customerPhone,
        startTime: new Date(a.startTime).toISOString(),
        endTime: new Date(a.endTime).toISOString(),
        status: a.status as 'CONFIRMED' | 'RESCHEDULED',
        price: a.price,
        canRescheduleNow,
        hoursRemaining: Math.max(0, Number(diffHours.toFixed(1))),
        alreadyRescheduledOnce: a.status === 'RESCHEDULED' || !!a.rescheduledFromId,
      };
    });

    return {
      success: true,
      appointments: mapped,
      policy,
    };
  } catch (err) {
    console.error('Error buscando turnos del cliente:', err);
    return {
      success: false,
      appointments: [],
      policy,
      error: 'Ocurrió un error al buscar tu turno. Intentá nuevamente.',
    };
  }
}

/**
 * Ejecuta la reprogramación autogestionada por el cliente validando la política de anticipación
 */
export async function clientSelfRescheduleAction(input: {
  appointmentId: string;
  customerPhone: string;
  newDateStr: string;
  newTimeStr: string;
}): Promise<{
  success: boolean;
  error?: string;
  updatedAppointment?: ClientAppointmentDTO;
}> {
  const { appointmentId, customerPhone, newDateStr, newTimeStr } = input;
  if (!appointmentId || !newDateStr || !newTimeStr) {
    return {
      success: false,
      error: 'Seleccioná una nueva fecha y horario válidos.',
    };
  }

  const policy = await getReschedulePolicy();
  if (!policy.enabled) {
    return {
      success: false,
      error:
        'La reprogramación automática se encuentra deshabilitada. Comunicate por WhatsApp con la barbería.',
    };
  }

  try {
    const records = await db
      .select({
        appointment: appointments,
        service: services,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    const record = records[0];
    if (!record || !record.service) {
      return { success: false, error: 'No se encontró el turno solicitado.' };
    }

    const { appointment, service } = record;

    // Verificar titularidad por teléfono
    if (
      normalizePhoneTail(appointment.customerPhone) !==
      normalizePhoneTail(customerPhone)
    ) {
      return {
        success: false,
        error: 'El número de WhatsApp no coincide con el titular de la reserva.',
      };
    }

    // Verificar que el turno esté confirmado o reprogramado
    if (
      appointment.status !== 'CONFIRMED' &&
      appointment.status !== 'RESCHEDULED'
    ) {
      return {
        success: false,
        error: 'Solo se pueden reprogramar turnos con pago confirmado.',
      };
    }

    // Verificar regla de anticipación mínima configurada por Diogo
    const now = new Date();
    const currentStartMs = new Date(appointment.startTime).getTime();
    const diffHours = (currentStartMs - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < policy.minHoursBefore) {
      return {
        success: false,
        error: `Los cambios de turno deben realizarse con al menos ${policy.minHoursBefore} ${
          policy.minHoursBefore === 1 ? 'hora' : 'horas'
        } de anticipación al horario reservado.`,
      };
    }

    // Verificar que el nuevo horario esté libre en tiempo real
    const availableSlots = await getAvailableSlots(service.id, newDateStr);
    const chosenSlot = availableSlots.find((s) => s.time === newTimeStr);

    if (!chosenSlot || !chosenSlot.available) {
      return {
        success: false,
        error:
          'Ese horario acaba de ocuparse. Por favor elegí otro horario disponible.',
      };
    }

    const newStartTime = parseDateTime(newDateStr, newTimeStr);
    const newEndTime = new Date(
      newStartTime.getTime() + service.durationMinutes * 60 * 1000
    );

    await db
      .update(appointments)
      .set({
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'RESCHEDULED',
        rescheduledFromId: appointment.id,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointment.id));

    revalidatePath('/dashboard');
    revalidatePath('/reservar');
    revalidatePath('/mi-turno');
    revalidatePath('/confirmacion');

    const newDiffHours =
      (newStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return {
      success: true,
      updatedAppointment: {
        id: appointment.id,
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        status: 'RESCHEDULED',
        price: appointment.price,
        canRescheduleNow: newDiffHours >= policy.minHoursBefore,
        hoursRemaining: Math.max(0, Number(newDiffHours.toFixed(1))),
        alreadyRescheduledOnce: true,
      },
    };
  } catch (err) {
    console.error('Error en clientSelfRescheduleAction:', err);
    return {
      success: false,
      error: 'Ocurrió un error al reprogramar tu turno. Intentá de nuevo.',
    };
  }
}
