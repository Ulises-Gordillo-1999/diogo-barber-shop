'use server';

import { db } from '@/db';
import { appointments, cashTransactions, services } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/utils/auth';

export interface SimulatePaymentResponse {
  success: boolean;
  error?: string;
}

/**
 * Server Action para simular la acreditación o rechazo de pago de Mercado Pago en entorno de desarrollo.
 * En producción queda bloqueado para clientes anónimos (requiere sesión de ADMIN o entorno de desarrollo).
 */
export async function simulatePaymentAction(
  appointmentId: string,
  outcome: 'approved' | 'rejected'
): Promise<SimulatePaymentResponse> {
  if (process.env.NODE_ENV === 'production') {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return {
        success: false,
        error: 'El simulador de pagos está deshabilitado en producción.',
      };
    }
  }

  try {
    const list = await db
      .select({
        appointment: appointments,
        service: services,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    const record = list[0];
    if (!record) {
      return { success: false, error: 'Turno no encontrado en la base de datos.' };
    }

    const { appointment, service } = record;

    if (outcome === 'approved') {
      // 1. Confirmar el turno y liberar el bloqueo temporal
      await db
        .update(appointments)
        .set({
          status: 'CONFIRMED',
          paymentStatus: 'APPROVED',
          expiresAt: null,
          mpPaymentId: `SIMULATED-${Date.now()}`,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointment.id));

      // 2. Insertar movimiento en caja si no existe
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
    } else {
      // 3. Marcar turno como cancelado
      await db
        .update(appointments)
        .set({
          status: 'CANCELLED',
          paymentStatus: 'REJECTED',
          cancellationReason: 'Pago simulado rechazado en Checkout Pro',
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointment.id));
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/caja');
    return { success: true };
  } catch (error) {
    console.error('Error al simular pago:', error);
    return { success: false, error: 'Error interno al simular el pago.' };
  }
}
