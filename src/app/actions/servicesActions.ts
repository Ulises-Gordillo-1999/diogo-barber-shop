'use server';

import { db } from '@/db';
import { services } from '@/db/schema';
import { ensureExtendedSchema } from '@/db/ensureSchema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/utils/auth';
import { revalidatePath } from 'next/cache';

export interface ServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  active?: boolean;
  suggestedProductIds?: string[];
}

export interface ServiceResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Server Action para crear un nuevo servicio en el catálogo
 */
export async function createServiceAction(input: ServiceInput): Promise<ServiceResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return { success: false, error: 'Acción permitida solo para administradores.' };
  }

  await ensureExtendedSchema();

  const {
    name,
    description,
    durationMinutes,
    price,
    active = true,
    suggestedProductIds = [],
  } = input;

  if (!name.trim() || durationMinutes <= 0 || price <= 0) {
    return {
      success: false,
      error: 'Por favor completá los campos obligatorios con valores válidos.',
    };
  }

  try {
    await db.insert(services).values({
      name: name.trim(),
      description: description?.trim() || null,
      durationMinutes,
      price: price.toFixed(2),
      active,
      suggestedProductIds: JSON.stringify(suggestedProductIds),
    });

    revalidatePath('/dashboard/servicios');
    revalidatePath('/reservar');
    return { success: true, message: 'Servicio creado exitosamente.' };
  } catch (error) {
    console.error('Error al crear servicio:', error);
    return { success: false, error: 'No se pudo crear el servicio.' };
  }
}

/**
 * Server Action para actualizar un servicio existente
 */
export async function updateServiceAction(
  id: string,
  input: ServiceInput
): Promise<ServiceResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return { success: false, error: 'Acción permitida solo para administradores.' };
  }

  await ensureExtendedSchema();

  const {
    name,
    description,
    durationMinutes,
    price,
    active,
    suggestedProductIds = [],
  } = input;

  try {
    await db
      .update(services)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        durationMinutes,
        price: price.toFixed(2),
        active,
        suggestedProductIds: JSON.stringify(suggestedProductIds),
        updatedAt: new Date(),
      })
      .where(eq(services.id, id));

    revalidatePath('/dashboard/servicios');
    revalidatePath('/reservar');
    return { success: true, message: 'Servicio actualizado.' };
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    return { success: false, error: 'No se pudo actualizar el servicio.' };
  }
}

/**
 * Server Action para alternar estado activo/inactivo en 1 toque
 */
export async function toggleServiceStatusAction(
  id: string,
  currentStatus: boolean
): Promise<ServiceResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return { success: false, error: 'Acción permitida solo para administradores.' };
  }

  try {
    await db
      .update(services)
      .set({
        active: !currentStatus,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id));

    revalidatePath('/dashboard/servicios');
    revalidatePath('/reservar');
    return { success: true };
  } catch (error) {
    console.error('Error al cambiar estado del servicio:', error);
    return { success: false, error: 'No se pudo alternar el estado.' };
  }
}

/**
 * Server Action para eliminar un servicio
 */
export async function deleteServiceAction(id: string): Promise<ServiceResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return { success: false, error: 'Acción permitida solo para administradores.' };
  }

  try {
    await db.delete(services).where(eq(services.id, id));
    revalidatePath('/dashboard/servicios');
    revalidatePath('/reservar');
    return { success: true, message: 'Servicio eliminado.' };
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    return {
      success: false,
      error:
        'No se puede eliminar un servicio que tiene turnos asociados. Podés desactivarlo.',
    };
  }
}
