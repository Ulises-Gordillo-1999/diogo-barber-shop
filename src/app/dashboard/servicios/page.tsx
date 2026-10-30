import { AppLayout } from '@/components/layout/AppLayout';
import { getSessionUser } from '@/utils/auth';
import { db } from '@/db';
import { services } from '@/db/schema';
import { ensureExtendedSchema } from '@/db/ensureSchema';
import { getProductsAction } from '@/app/actions/productActions';
import { asc } from 'drizzle-orm';
import { ServicesManager } from '@/components/servicios/ServicesManager';

export const dynamic = 'force-dynamic';

export default async function ServiciosPage() {
  await ensureExtendedSchema();
  const sessionUser = await getSessionUser();
  const isAdmin = sessionUser?.role === 'ADMIN';

  const [allServices, allProducts] = await Promise.all([
    db.select().from(services).orderBy(asc(services.displayOrder)),
    getProductsAction(false),
  ]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <ServicesManager
          initialServices={allServices}
          availableProducts={allProducts}
          isAdmin={isAdmin}
        />
      </div>
    </AppLayout>
  );
}
