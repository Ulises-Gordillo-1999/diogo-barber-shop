import { AppLayout } from '@/components/layout/AppLayout';
import { getSessionUser } from '@/utils/auth';
import { db } from '@/db';
import { services } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { ServicesManager } from '@/components/servicios/ServicesManager';

export const dynamic = 'force-dynamic';

export default async function ServiciosPage() {
  const sessionUser = await getSessionUser();
  const isAdmin = sessionUser?.role === 'ADMIN';

  const allServices = await db
    .select()
    .from(services)
    .orderBy(asc(services.displayOrder));

  return (
    <AppLayout>
      <div className="space-y-6">
        <ServicesManager initialServices={allServices} isAdmin={isAdmin} />
      </div>
    </AppLayout>
  );
}
