import { AppLayout } from '@/components/layout/AppLayout';
import { getSessionUser } from '@/utils/auth';
import { db } from '@/db';
import { appointments, services } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { AgendaView, type AppointmentItem } from '@/components/agenda/AgendaView';
import { syncPendingAppointments } from '@/utils/mercadopago';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const sessionUser = await getSessionUser();

  // Sincronizar automáticamente en tiempo real turnos pendientes con Mercado Pago
  await syncPendingAppointments();

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Obtener todos los servicios activos para el modal manual y nombres
  const allServices = await db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.displayOrder));

  // 2. Obtener turnos
  const appointmentRecords = await db
    .select({
      id: appointments.id,
      serviceId: appointments.serviceId,
      customerName: appointments.customerName,
      customerPhone: appointments.customerPhone,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      price: appointments.price,
      paymentMethod: appointments.paymentMethod,
      paymentStatus: appointments.paymentStatus,
      serviceName: services.name,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .orderBy(desc(appointments.startTime));

  const initialAppointments: AppointmentItem[] = appointmentRecords.map((r) => ({
    id: r.id,
    serviceId: r.serviceId,
    serviceName: r.serviceName || 'Corte Clásico',
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    startTime: r.startTime,
    endTime: r.endTime,
    status: r.status,
    price: r.price,
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <AgendaView
          initialAppointments={initialAppointments}
          services={allServices}
          initialDateStr={todayStr}
        />
      </div>
    </AppLayout>
  );
}
