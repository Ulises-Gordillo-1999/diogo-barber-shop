import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { appointments, cashTransactions, services } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getMpPayment, verifyMercadoPagoSignature } from '@/utils/mercadopago';

export async function POST(request: NextRequest) {
  try {
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');

    const searchParams = request.nextUrl.searchParams;
    let topic = searchParams.get('type') || searchParams.get('topic');
    let dataId: string | null | undefined =
      searchParams.get('data.id') || searchParams.get('id');

    let body: { action?: string; type?: string; data?: { id?: string } } = {};
    try {
      body = await request.json();
      if (!dataId && body.data?.id) {
        dataId = body.data.id;
      }
      if (!topic && (body.type || body.action)) {
        topic = body.type || body.action || null;
      }
    } catch {
      // Body vacío o no parseable
    }

    if (!dataId) {
      return NextResponse.json({ message: 'Sin data.id para procesar' }, { status: 200 });
    }

    // 1. Validar firma criptográfica x-signature
    const isValidSignature = verifyMercadoPagoSignature(xSignature, xRequestId, dataId);
    if (!isValidSignature) {
      console.warn('⚠️ Firma x-signature inválida en webhook de Mercado Pago.');
      return NextResponse.json({ error: 'Firma criptográfica inválida' }, { status: 401 });
    }

    // 2. Solo procesar eventos relacionados a pagos
    if (topic && !topic.includes('payment')) {
      return NextResponse.json({ message: `Ignorando tópico ${topic}` }, { status: 200 });
    }

    // 3. Consultar los detalles del pago directamente en la API oficial de Mercado Pago
    let paymentData: {
      status?: string;
      external_reference?: string;
      id?: number | string;
      transaction_amount?: number;
    } | null = null;

    try {
      const paymentResponse = await getMpPayment().get({ id: dataId });
      paymentData = paymentResponse;
    } catch (apiError) {
      console.error(`Error al consultar pago ${dataId} en Mercado Pago:`, apiError);
      return NextResponse.json({ error: 'Error al consultar API de MP' }, { status: 500 });
    }

    if (!paymentData || !paymentData.external_reference) {
      return NextResponse.json({ message: 'Pago sin external_reference' }, { status: 200 });
    }

    const appointmentId = paymentData.external_reference;

    // 4. Buscar el turno asociado en la base de datos
    const appointmentList = await db
      .select({
        appointment: appointments,
        service: services,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    const record = appointmentList[0];
    if (!record) {
      console.warn(`Turno ${appointmentId} no encontrado en base de datos.`);
      return NextResponse.json({ message: 'Turno no encontrado' }, { status: 200 });
    }

    const { appointment, service } = record;

    // 5. Si el pago fue aprobado: Confirmar turno e impactar en caja
    if (paymentData.status === 'approved') {
      // A. Actualizar estado del turno a CONFIRMED y liberar bloqueo temporal
      await db
        .update(appointments)
        .set({
          status: 'CONFIRMED',
          paymentStatus: 'APPROVED',
          expiresAt: null,
          mpPaymentId: String(paymentData.id),
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointment.id));

      // B. Idempotencia: Verificar si ya existe movimiento de caja registrado para este turno
      const existingTx = await db
        .select()
        .from(cashTransactions)
        .where(eq(cashTransactions.appointmentId, appointment.id))
        .limit(1);

      if (existingTx.length === 0) {
        // C. Registrar ingreso automático en caja
        await db.insert(cashTransactions).values({
          type: 'INCOME',
          category: 'APPOINTMENT',
          amount: appointment.price,
          paymentMethod: 'MERCADOPAGO',
          description: `Cobro online turno - ${appointment.customerName} (${service?.name || 'Servicio'})`,
          appointmentId: appointment.id,
          transactionDate: new Date(),
        });

        console.log(
          `✅ Turno ${appointment.id} CONFIRMADO e ingreso de $${appointment.price} registrado en caja.`
        );
      }

      revalidatePath('/dashboard');
      revalidatePath('/dashboard/caja');
      revalidatePath('/reservar');
    } else if (
      paymentData.status === 'rejected' ||
      paymentData.status === 'cancelled'
    ) {
      // Si el pago fue rechazado o cancelado, liberar el turno
      await db
        .update(appointments)
        .set({
          status: 'CANCELLED',
          paymentStatus: 'REJECTED',
          cancellationReason: `Pago Mercado Pago ${paymentData.status}`,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointment.id));

      revalidatePath('/dashboard');
      revalidatePath('/reservar');

      console.log(`❌ Turno ${appointment.id} cancelado por pago rechazado.`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error no controlado en webhook de Mercado Pago:', error);
    return NextResponse.json(
      { error: 'Error interno en procesamiento de webhook' },
      { status: 500 }
    );
  }
}
