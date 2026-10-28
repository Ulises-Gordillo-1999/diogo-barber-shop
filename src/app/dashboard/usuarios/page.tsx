import { AppLayout } from '@/components/layout/AppLayout';
import { getSessionUser } from '@/utils/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { UsersManager } from '@/components/usuarios/UsersManager';

export const dynamic = 'force-dynamic';

export default async function UsuariosDashboardPage() {
  const sessionUser = await getSessionUser();
  const isAdmin = sessionUser?.role === 'ADMIN';

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));

  return (
    <AppLayout>
      <div className="space-y-6">
        <UsersManager initialUsers={allUsers} isAdmin={isAdmin} />
      </div>
    </AppLayout>
  );
}
