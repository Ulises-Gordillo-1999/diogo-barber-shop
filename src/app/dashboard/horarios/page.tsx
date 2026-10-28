import { AppLayout } from '@/components/layout/AppLayout';
import { getSessionUser } from '@/utils/auth';
import { db } from '@/db';
import { businessHours, scheduleBlocks } from '@/db/schema';
import { asc, desc, gte } from 'drizzle-orm';
import { ScheduleManager } from '@/components/horarios/ScheduleManager';
import { getReschedulePolicy } from '@/app/actions/clientRescheduleActions';

export const dynamic = 'force-dynamic';

export default async function HorariosPage() {
  const sessionUser = await getSessionUser();
  const isAdmin = sessionUser?.role === 'ADMIN';

  // 1. Obtener horarios semanales ordenados de Domingo (0) a Sábado (6)
  const allHours = await db
    .select()
    .from(businessHours)
    .where(gte(businessHours.dayOfWeek, 0))
    .orderBy(asc(businessHours.dayOfWeek));

  // 2. Obtener bloqueos de agenda
  const allBlocks = await db
    .select()
    .from(scheduleBlocks)
    .orderBy(desc(scheduleBlocks.startDate));

  // 3. Obtener política de reprogramación de clientes
  const reschedulePolicy = await getReschedulePolicy();

  return (
    <AppLayout>
      <div className="space-y-6">
        <ScheduleManager
          initialHours={allHours}
          initialBlocks={allBlocks}
          initialReschedulePolicy={reschedulePolicy}
          isAdmin={isAdmin}
        />
      </div>
    </AppLayout>
  );
}
