'use server';

import { db } from '@/db';
import { businessHours, scheduleBlocks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/utils/auth';
import { revalidatePath } from 'next/cache';

export interface WeeklyHourUpdate {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  hasBreak: boolean;
  openTime2?: string;
  closeTime2?: string;
}

export interface CreateBlockInput {
  title: string;
  reason?: string;
  startDateStr: string; // "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm"
  endDateStr: string;
  isAllDay: boolean;
}

export interface ScheduleActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Server Action para actualizar el horario laboral de un día de la semana
 */
export async function updateWeeklyHoursAction(
  input: WeeklyHourUpdate
): Promise<ScheduleActionResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return { success: false, error: 'Acción permitida solo para administradores.' };
  }

  const { dayOfWeek, isOpen, openTime, closeTime, hasBreak, openTime2, closeTime2 } = input;

  try {
    await db
      .update(businessHours)
      .set({
        isOpen,
        openTime,
        closeTime,
        hasBreak,
        openTime2: hasBreak ? openTime2 || null : null,
        closeTime2: hasBreak ? closeTime2 || null : null,
        updatedAt: new Date(),
      })
      .where(eq(businessHours.dayOfWeek, dayOfWeek));

    revalidatePath('/dashboard/horarios');
    revalidatePath('/reservar');
    return { success: true, message: 'Horario actualizado.' };
  } catch (error) {
    console.error('Error al actualizar horario semanal:', error);
    return { success: false, error: 'No se pudo actualizar el horario.' };
  }
}

/**
 * Server Action para crear un bloqueo de agenda (feriado, vacaciones, día no laborable)
 */
export async function createScheduleBlockAction(
  input: CreateBlockInput
): Promise<ScheduleActionResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return { success: false, error: 'Acción permitida solo para administradores.' };
  }

  const { title, reason, startDateStr, endDateStr, isAllDay } = input;

  if (!title.trim() || !startDateStr || !endDateStr) {
    return { success: false, error: 'Por favor completá los campos obligatorios.' };
  }

  try {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (endDate < startDate) {
      return { success: false, error: 'La fecha de fin debe ser posterior al inicio.' };
    }

    await db.insert(scheduleBlocks).values({
      title: title.trim(),
      reason: reason?.trim() || null,
      startDate,
      endDate,
      isAllDay,
      createdBy: sessionUser.id,
    });

    revalidatePath('/dashboard/horarios');
    revalidatePath('/reservar');
    return { success: true, message: 'Bloqueo de agenda creado exitosamente.' };
  } catch (error) {
    console.error('Error al crear bloqueo:', error);
    return { success: false, error: 'No se pudo crear el bloqueo.' };
  }
}

/**
 * Server Action para eliminar un bloqueo de agenda
 */
export async function deleteScheduleBlockAction(
  blockId: string
): Promise<ScheduleActionResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return { success: false, error: 'Acción permitida solo para administradores.' };
  }

  try {
    await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, blockId));
    revalidatePath('/dashboard/horarios');
    revalidatePath('/reservar');
    return { success: true, message: 'Bloqueo eliminado.' };
  } catch (error) {
    console.error('Error al eliminar bloqueo:', error);
    return { success: false, error: 'No se pudo eliminar el bloqueo.' };
  }
}
