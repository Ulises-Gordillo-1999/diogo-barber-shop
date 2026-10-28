'use server';

import { db } from '@/db';
import { cashTransactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/utils/auth';
import { revalidatePath } from 'next/cache';

export interface CreateTransactionInput {
  type: 'INCOME' | 'EXPENSE';
  category:
    | 'APPOINTMENT'
    | 'PRODUCT_SALE'
    | 'OTHER_INCOME'
    | 'SUPPLIES'
    | 'PRODUCTS_STOCK'
    | 'RENT'
    | 'SERVICES'
    | 'MAINTENANCE'
    | 'WITHDRAWAL'
    | 'OTHER_EXPENSE';
  amount: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'MERCADOPAGO';
  description: string;
  transactionDate?: string; // "YYYY-MM-DD"
}

export interface CashActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Server Action para registrar un nuevo movimiento manual en la caja (Ingreso o Egreso)
 */
export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<CashActionResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { success: false, error: 'No autorizado. Iniciá sesión nuevamente.' };
  }

  const { type, category, amount, paymentMethod, description, transactionDate } = input;

  if (!type || !category || !amount || amount <= 0 || !paymentMethod || !description.trim()) {
    return { success: false, error: 'Por favor completá todos los campos obligatorios.' };
  }

  try {
    const txDate = transactionDate ? new Date(`${transactionDate}T12:00:00`) : new Date();

    await db.insert(cashTransactions).values({
      type,
      category,
      amount: amount.toFixed(2),
      paymentMethod,
      description: description.trim(),
      userId: sessionUser.id,
      transactionDate: txDate,
    });

    revalidatePath('/dashboard/caja');
    revalidatePath('/dashboard');
    return { success: true, message: 'Movimiento registrado con éxito.' };
  } catch (error) {
    console.error('Error al registrar movimiento en caja:', error);
    return { success: false, error: 'Error interno al registrar el movimiento.' };
  }
}

/**
 * Server Action para eliminar un movimiento de caja (Solo permitido para administradores)
 */
export async function deleteTransactionAction(
  transactionId: string
): Promise<CashActionResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return { success: false, error: 'Solo los administradores pueden eliminar registros de caja.' };
  }

  try {
    await db.delete(cashTransactions).where(eq(cashTransactions.id, transactionId));
    revalidatePath('/dashboard/caja');
    return { success: true, message: 'Movimiento eliminado.' };
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    return { success: false, error: 'No se pudo eliminar el movimiento.' };
  }
}
