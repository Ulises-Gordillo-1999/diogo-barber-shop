import { db } from '@/db';
import { appointments, services } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { CheckoutSimulatorClient } from './CheckoutSimulatorClient';

export const dynamic = 'force-dynamic';

interface CheckoutSimulatorPageProps {
  searchParams: Promise<{
    appointmentId?: string;
  }>;
}

export default async function CheckoutSimulatorPage({
  searchParams,
}: CheckoutSimulatorPageProps) {
  const { appointmentId } = await searchParams;

  if (!appointmentId) {
    redirect('/reservar');
  }

  const list = await db
    .select({
      id: appointments.id,
      customerName: appointments.customerName,
      customerPhone: appointments.customerPhone,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      expiresAt: appointments.expiresAt,
      price: appointments.price,
      serviceName: services.name,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  const appointment = list[0];
  if (!appointment) {
    notFound();
  }

  return (
    <CheckoutSimulatorClient
      appointment={{
        ...appointment,
        serviceName: appointment.serviceName || 'Servicio de Barbería',
        expiresAt: appointment.expiresAt ? appointment.expiresAt.toISOString() : null,
        startTime: appointment.startTime.toISOString(),
      }}
    />
  );
}
