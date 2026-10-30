import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { appointments, productOrders } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import {
  getMpPayment,
  verifyMercadoPagoSignature,
  confirmAppointmentGroupAndProducts,
  confirmProductOrderPayment,
} from '@/utils/mercadopago';
import { ensureExtendedSchema } from '@/db/ensureSchema';

export async function POST(request: NextRequest) {
  try {
    await ensureExtendedSchema();

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

    const externalRef = paymentData.external_reference;

    // 4. Caso A: Orden de Compra de Productos de la Tienda (/tienda)
    if (externalRef.startsWith('ORDER:')) {
      const orderId = externalRef.replace('ORDER:', '');

      if (paymentData.status === 'approved') {
        await confirmProductOrderPayment(orderId, String(paymentData.id));
        revalidatePath('/dashboard/inventario');
        revalidatePath('/dashboard/caja');
        revalidatePath('/tienda');
      } else if (
        paymentData.status === 'rejected' ||
        paymentData.status === 'cancelled'
      ) {
        await db
          .update(productOrders)
          .set({
            status: 'CANCELLED',
            paymentStatus: 'REJECTED',
            updatedAt: new Date(),
          })
          .where(eq(productOrders.id, orderId));

        revalidatePath('/dashboard/inventario');
      }

      return NextResponse.json({ received: true, type: 'order' }, { status: 200 });
    }

    // 5. Caso B: Reserva de Turno Individual o Múltiple (+ Productos Upsell)
    const appointmentId = externalRef;

    if (paymentData.status === 'approved') {
      await confirmAppointmentGroupAndProducts(appointmentId, String(paymentData.id));
      revalidatePath('/dashboard');
      revalidatePath('/dashboard/caja');
      revalidatePath('/dashboard/inventario');
      revalidatePath('/reservar');
    } else if (
      paymentData.status === 'rejected' ||
      paymentData.status === 'cancelled'
    ) {
      await db
        .update(appointments)
        .set({
          status: 'CANCELLED',
          paymentStatus: 'REJECTED',
          cancellationReason: `Pago Mercado Pago ${paymentData.status}`,
          updatedAt: new Date(),
        })
        .where(
          or(
            eq(appointments.id, appointmentId),
            eq(appointments.groupBookingId, appointmentId)
          )
        );

      revalidatePath('/dashboard');
      revalidatePath('/reservar');
    }

    return NextResponse.json({ received: true, type: 'appointment' }, { status: 200 });
  } catch (error) {
    console.error('Error no controlado en webhook de Mercado Pago:', error);
    return NextResponse.json(
      { error: 'Error interno en procesamiento de webhook' },
      { status: 500 }
    );
  }
}
