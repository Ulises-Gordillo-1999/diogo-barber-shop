import { AppLayout } from '@/components/layout/AppLayout';
import { getSessionUser } from '@/utils/auth';
import { db } from '@/db';
import { cashTransactions } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { CashFlowView, type CashTransactionItem } from '@/components/caja/CashFlowView';
import { syncPendingAppointments } from '@/utils/mercadopago';

export const dynamic = 'force-dynamic';

export default async function CajaPage() {
  const sessionUser = await getSessionUser();
  const isAdmin = sessionUser?.role === 'ADMIN';

  // Sincronizar automáticamente cobros pendientes con Mercado Pago
  await syncPendingAppointments();

  // Obtener todos los movimientos de caja ordenados por fecha descendente
  const txRecords = await db
    .select()
    .from(cashTransactions)
    .orderBy(desc(cashTransactions.transactionDate));

  const initialTransactions: CashTransactionItem[] = txRecords.map((r) => ({
    id: r.id,
    type: r.type,
    category: r.category,
    amount: Number(r.amount),
    paymentMethod: r.paymentMethod,
    description: r.description,
    appointmentId: r.appointmentId,
    transactionDate: r.transactionDate,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <CashFlowView initialTransactions={initialTransactions} isAdmin={isAdmin} />
      </div>
    </AppLayout>
  );
}
