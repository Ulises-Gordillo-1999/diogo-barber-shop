import { db } from '@/db';
import { appointments, businessHours, scheduleBlocks, services } from '@/db/schema';
import { eq, and, or, gt, gte, lte, inArray } from 'drizzle-orm';

export interface TimeSlot {
  time: string; // "10:00"
  startTime: Date;
  endTime: Date;
  available: boolean;
  reason?: string;
}

// Zona horaria comercial de Diogo Barber Shop (Catamarca / Argentina: UTC-3)
const TIMEZONE_OFFSET_HOURS = -3;
const TIMEZONE_OFFSET_STR = '-03:00';

/**
 * Convierte fecha "YYYY-MM-DD" y hora "HH:MM" en objeto Date fijado en UTC-3 (Argentina).
 * Esto evita desfases horarios si el servidor corre en UTC (VPS Docker por defecto).
 */
export function parseDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Construir string ISO con offset estricto de Argentina
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00${TIMEZONE_OFFSET_STR}`;
  return new Date(iso);
}

/**
 * Formatea Date a "HH:MM" en la zona horaria de Argentina (America/Argentina/Catamarca)
 */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Catamarca',
  }).format(date);
}

/**
 * Obtiene los huecos libres disponibles para un servicio y fecha específicos
 * aplicando la regla de bloqueo anti-colisión de 10 minutos para pagos pendientes.
 */
export async function getAvailableSlots(
  serviceId: string,
  dateStr: string // "YYYY-MM-DD"
): Promise<TimeSlot[]> {
  // 1. Obtener información del servicio
  const serviceList = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.active, true)))
    .limit(1);

  const service = serviceList[0];
  if (!service) {
    return [];
  }

  const durationMinutes = service.durationMinutes;

  // 2. Determinar día de la semana fijado en Argentina
  const noonDate = new Date(`${dateStr}T12:00:00${TIMEZONE_OFFSET_STR}`);
  const dayOfWeek = noonDate.getDay();

  // 3. Obtener configuración de horario laboral del día
  const hoursList = await db
    .select()
    .from(businessHours)
    .where(eq(businessHours.dayOfWeek, dayOfWeek))
    .limit(1);

  const schedule = hoursList[0];
  if (!schedule || !schedule.isOpen) {
    return []; // Cerrado este día
  }

  // 4. Fechas límite del día en Argentina (00:00 a 23:59:59.999 UTC-3)
  const startOfDay = new Date(`${dateStr}T00:00:00.000${TIMEZONE_OFFSET_STR}`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999${TIMEZONE_OFFSET_STR}`);
  const now = new Date();

  // 5. Consultar bloqueos de agenda vigentes (feriados, descansos, etc.)
  const blocks = await db
    .select()
    .from(scheduleBlocks)
    .where(
      and(
        lte(scheduleBlocks.startDate, endOfDay),
        gte(scheduleBlocks.endDate, startOfDay)
      )
    );

  // Si hay un bloqueo de día completo
  const fullDayBlock = blocks.find((b) => b.isAllDay);
  if (fullDayBlock) {
    return [];
  }

  // 6. Consultar turnos ocupantes:
  // - CONFIRMED, COMPLETED, RESCHEDULED
  // - O PENDING_PAYMENT con expiresAt > NOW() (bloqueo temporal de 10 min activo)
  const occupiedAppointments = await db
    .select({
      id: appointments.id,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      expiresAt: appointments.expiresAt,
    })
    .from(appointments)
    .where(
      and(
        gte(appointments.startTime, startOfDay),
        lte(appointments.startTime, endOfDay),
        or(
          inArray(appointments.status, ['CONFIRMED', 'COMPLETED', 'RESCHEDULED']),
          and(
            eq(appointments.status, 'PENDING_PAYMENT'),
            gt(appointments.expiresAt, now)
          )
        )
      )
    );

  // 7. Generar candidatos de slots dentro de las franjas horarias
  const shifts: { open: string; close: string }[] = [];
  shifts.push({ open: schedule.openTime, close: schedule.closeTime });

  if (schedule.hasBreak && schedule.openTime2 && schedule.closeTime2) {
    shifts.push({ open: schedule.openTime2, close: schedule.closeTime2 });
  }

  const slots: TimeSlot[] = [];
  const slotIntervalMinutes = 30; // Granularidad de inicio de turnos

  for (const shift of shifts) {
    const shiftStart = parseDateTime(dateStr, shift.open);
    const shiftEnd = parseDateTime(dateStr, shift.close);

    let current = new Date(shiftStart.getTime());

    while (true) {
      const slotStart = new Date(current.getTime());
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

      // Si el turno sobrepasa el final de la franja horaria, cortar
      if (slotEnd.getTime() > shiftEnd.getTime()) {
        break;
      }

      // Validar si el slot ya pasó hoy (margen de 15 minutos de anticipación mínima)
      const isPast = slotStart.getTime() <= now.getTime() + 15 * 60 * 1000;

      // Validar colisión con turnos existentes
      const hasAppointmentCollision = occupiedAppointments.some((app) => {
        const appStart = new Date(app.startTime).getTime();
        const appEnd = new Date(app.endTime).getTime();
        const sStart = slotStart.getTime();
        const sEnd = slotEnd.getTime();
        return sStart < appEnd && sEnd > appStart;
      });

      // Validar colisión con bloqueos parciales
      const hasBlockCollision = blocks.some((b) => {
        const bStart = new Date(b.startDate).getTime();
        const bEnd = new Date(b.endDate).getTime();
        const sStart = slotStart.getTime();
        const sEnd = slotEnd.getTime();
        return sStart < bEnd && sEnd > bStart;
      });

      const available = !isPast && !hasAppointmentCollision && !hasBlockCollision;

      slots.push({
        time: formatTime(slotStart),
        startTime: slotStart,
        endTime: slotEnd,
        available,
        reason: isPast
          ? 'Horario pasado'
          : hasAppointmentCollision
          ? 'Horario reservado'
          : hasBlockCollision
          ? 'Horario bloqueado'
          : undefined,
      });

      // Avanzar al siguiente intervalo
      current = new Date(current.getTime() + slotIntervalMinutes * 60 * 1000);
    }
  }

  return slots;
}
