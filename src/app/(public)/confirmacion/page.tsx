import { db } from '@/db';
import { appointments, productOrders, services } from '@/db/schema';
import { eq, or, asc } from 'drizzle-orm';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  ArrowRight,
  RotateCcw,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { syncPendingAppointments } from '@/utils/mercadopago';
import { getReschedulePolicy } from '@/app/actions/clientRescheduleActions';
import { ensureExtendedSchema } from '@/db/ensureSchema';

interface ConfirmacionPageProps {
  searchParams: Promise<{
    appointmentId?: string;
    orderId?: string;
    status?: string;
    collection_status?: string;
  }>;
}

export default async function ConfirmacionPage({ searchParams }: ConfirmacionPageProps) {
  const {
    appointmentId,
    orderId,
    status,
    collection_status,
  } = await searchParams;

  await ensureExtendedSchema();
  // Reconciliación segura server-to-server contra la API oficial de Mercado Pago
  await syncPendingAppointments();
  const reschedulePolicy = await getReschedulePolicy();

  // Caso 1: Orden de Compra de Productos (/tienda)
  if (orderId) {
    const orderRows = await db
      .select()
      .from(productOrders)
      .where(eq(productOrders.id, orderId))
      .limit(1);

    const order = orderRows[0] || null;
    const isOrderApproved = order?.paymentStatus === 'APPROVED' || order?.status === 'PAID';
    const isOrderFailure =
      order?.status === 'CANCELLED' ||
      status === 'failure' ||
      status === 'rejected' ||
      collection_status === 'rejected';

    let parsedItems: Array<{ name: string; quantity: number; unitPrice: number }> = [];
    if (order?.itemsJson) {
      try {
        parsedItems = JSON.parse(order.itemsJson);
      } catch {
        parsedItems = [];
      }
    }

    const barberPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '5493834064982';
    const orderWaMsg = encodeURIComponent(
      `¡Hola Diogo! Acabo de abonar mi compra en la Tienda Online (${parsedItems
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(', ')}) a nombre de ${order?.customerName || ''}. Modalidad: ${
        order?.deliveryType === 'COURIER'
          ? `Envío por Cadete a ${order.shippingAddress} (${order.shippingZoneName})`
          : 'Retiro en la Barbería'
      }.`
    );

    return (
      <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-[#0c0b0d] text-slate-900 dark:text-[#f3ede4] transition-colors">
        <header className="border-b border-slate-200 dark:border-[#2c2830] px-4 sm:px-6 py-3 flex items-center justify-between bg-white/80 dark:bg-[#161419]/90 backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-[#e3b964]/40 bg-zinc-900 shrink-0">
              <img
                src="/images/logo-diogo.webp"
                alt="Diogo Barber Shop"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-[#f3ede4]">
              Diogo Barber Shop
            </span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg bg-white dark:bg-[#161419] border border-slate-200 dark:border-[#2c2830] rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
            {isOrderApproved && order ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-2">
                    Compra Confirmada al 100%
                  </span>
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    ¡Tu pedido ya está reservado!
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-[#a39b93] mt-1">
                    Diogo Barber Shop ya recibió los detalles de tus productos.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c0b0d] border border-slate-200 dark:border-[#2c2830] text-left space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-200 dark:border-[#2c2830] pb-2">
                    <span className="text-slate-500">Cliente:</span>
                    <strong>{order.customerName}</strong>
                  </div>
                  <div className="border-b border-slate-200 dark:border-[#2c2830] pb-2 space-y-1">
                    <span className="text-slate-500 block">Productos:</span>
                    {parsedItems.map((it, idx) => (
                      <div key={idx} className="flex justify-between font-semibold">
                        <span>
                          {it.quantity}x {it.name}
                        </span>
                        <span>${(it.unitPrice * it.quantity).toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-[#2c2830] pb-2">
                    <span className="text-slate-500">Entrega:</span>
                    <strong className="text-amber-600 dark:text-[#e3b964] text-right">
                      {order.deliveryType === 'COURIER'
                        ? `Envío por Cadete (${order.shippingZoneName})`
                        : 'Retiro en la Barbería ($0)'}
                    </strong>
                  </div>
                  {order.deliveryType === 'COURIER' && order.shippingAddress && (
                    <div className="flex justify-between border-b border-slate-200 dark:border-[#2c2830] pb-2">
                      <span className="text-slate-500">Dirección:</span>
                      <strong className="text-right">{order.shippingAddress}</strong>
                    </div>
                  )}
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Total Abonado:</span>
                    <strong className="text-sm">
                      ${Number(order.totalPaid).toLocaleString('es-AR')}
                    </strong>
                  </div>
                </div>

                {order.deliveryType === 'COURIER' && (
                  <div className="p-3.5 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-left flex items-start gap-2.5 text-xs">
                    <Truck className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                    <span>
                      Nuestro cadete se comunicará a tu WhatsApp para coordinar la entrega en{' '}
                      <strong>{order.shippingAddress}</strong>.
                    </span>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <a
                    href={`https://wa.me/${barberPhone}?text=${orderWaMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold bg-[#4fbf84] hover:bg-emerald-500 text-zinc-950 shadow-md transition-all min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar Comprobante por WhatsApp</span>
                  </a>
                  <Link
                    href="/tienda"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-[#a39b93] min-h-[44px]"
                  >
                    <span>Volver a la Tienda</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </>
            ) : isOrderFailure ? (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <XCircle className="w-9 h-9" />
                </div>
                <h1 className="text-2xl font-extrabold">No se concretó el pago</h1>
                <Link
                  href="/tienda"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold bg-[#e3b964] text-[#0c0b0d] min-h-[44px]"
                >
                  Volver a la Tienda
                </Link>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[#e3b964]/10 border border-[#e3b964]/20 text-amber-600 dark:text-[#e3b964] flex items-center justify-center mx-auto">
                  <Clock className="w-9 h-9" />
                </div>
                <h1 className="text-2xl font-extrabold">Verificando tu pago...</h1>
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1f1c22] min-h-[44px]"
                >
                  Volver al inicio
                </Link>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Caso 2: Reserva de Turno Individual o Múltiple (+ Productos Upsell)
  let groupAppointments: Array<{
    id: string;
    customerName: string;
    customerPhone: string;
    startTime: Date;
    endTime: Date;
    status: string;
    price: string;
    serviceName: string | null;
    attachedProductsJson: string | null;
  }> = [];

  if (appointmentId) {
    groupAppointments = await db
      .select({
        id: appointments.id,
        customerName: appointments.customerName,
        customerPhone: appointments.customerPhone,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        price: appointments.price,
        serviceName: services.name,
        attachedProductsJson: appointments.attachedProductsJson,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        or(
          eq(appointments.id, appointmentId),
          eq(appointments.groupBookingId, appointmentId)
        )
      )
      .orderBy(asc(appointments.startTime));
  }

  const appointmentData = groupAppointments[0] || null;

  let attachedProducts: Array<{ name: string; quantity: number; unitPrice: number }> = [];
  if (appointmentData?.attachedProductsJson) {
    try {
      attachedProducts = JSON.parse(appointmentData.attachedProductsJson);
    } catch {
      attachedProducts = [];
    }
  }

  const isApproved =
    appointmentData?.status === 'CONFIRMED' ||
    appointmentData?.status === 'RESCHEDULED';
  const isFailure =
    appointmentData?.status === 'CANCELLED' ||
    status === 'failure' ||
    status === 'rejected' ||
    collection_status === 'rejected';

  const formatSlotDateTime = (dt: Date) => {
    const dStr = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Argentina/Catamarca',
    }).format(new Date(dt));
    const tStr = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Catamarca',
    }).format(new Date(dt));
    return `${dStr} a las ${tStr} hs`;
  };

  const totalAppointmentsAmount = groupAppointments.reduce(
    (acc, a) => acc + Number(a.price),
    0
  );
  const totalProductsAmount = attachedProducts.reduce(
    (acc, p) => acc + Number(p.unitPrice) * Number(p.quantity),
    0
  );
  const grandTotalPaid = totalAppointmentsAmount + totalProductsAmount;

  const barberPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '5493834064982';
  const slotsSummaryText = groupAppointments
    .map((a) => formatSlotDateTime(a.startTime))
    .join(' / ');
  const whatsappMsg = encodeURIComponent(
    `¡Hola Diogo! Acabo de confirmar y abonar ${
      groupAppointments.length > 1
        ? `mis ${groupAppointments.length} turnos`
        : 'mi turno'
    } para ${appointmentData?.serviceName || 'Corte'} (${slotsSummaryText}).${
      attachedProducts.length > 0
        ? ` Además sumé: ${attachedProducts.map((p) => `${p.quantity}x ${p.name}`).join(', ')}.`
        : ''
    } Mi nombre es ${appointmentData?.customerName || ''}.`
  );

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-[#0c0b0d] text-slate-900 dark:text-[#f3ede4] transition-colors">
      <header className="border-b border-slate-200 dark:border-[#2c2830] px-4 sm:px-6 py-3 flex items-center justify-between bg-white/80 dark:bg-[#161419]/90 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#e3b964]/40 bg-zinc-900 shrink-0">
            <img
              src="/images/logo-diogo.webp"
              alt="Diogo Barber Shop"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-[#f3ede4]">
            Diogo Barber Shop
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white dark:bg-[#161419] border border-slate-200 dark:border-[#2c2830] rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          {isApproved ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-2">
                  Pago Acreditado al 100%
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#f3ede4]">
                  {groupAppointments.length > 1
                    ? `¡${groupAppointments.length} Turnos Confirmados!`
                    : '¡Turno Confirmado!'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-[#a39b93] mt-1 max-w-sm mx-auto">
                  Tu reserva fue confirmada con éxito en Diogo Barber Shop. Ya te estamos esperando.
                </p>
              </div>

              {appointmentData && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c0b0d] border border-slate-200 dark:border-[#2c2830] text-left space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2c2830] pb-2">
                    <span className="text-slate-500 dark:text-[#a39b93]">Cliente:</span>
                    <strong className="text-slate-900 dark:text-[#f3ede4]">
                      {appointmentData.customerName}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2c2830] pb-2">
                    <span className="text-slate-500 dark:text-[#a39b93]">Servicio:</span>
                    <strong className="text-slate-900 dark:text-[#f3ede4]">
                      {appointmentData.serviceName}
                    </strong>
                  </div>
                  <div className="border-b border-slate-200 dark:border-[#2c2830] pb-2 space-y-1">
                    <span className="text-slate-500 dark:text-[#a39b93] block">
                      {groupAppointments.length > 1
                        ? 'Fechas y Horarios Reservados:'
                        : 'Fecha y Hora:'}
                    </span>
                    {groupAppointments.map((app, i) => (
                      <strong
                        key={app.id}
                        className="text-amber-600 dark:text-[#e3b964] capitalize block"
                      >
                        {groupAppointments.length > 1 ? `#${i + 1}: ` : ''}
                        {formatSlotDateTime(app.startTime)}
                      </strong>
                    ))}
                  </div>

                  {attachedProducts.length > 0 && (
                    <div className="border-b border-slate-200 dark:border-[#2c2830] pb-2 space-y-1">
                      <span className="text-slate-500 dark:text-[#a39b93] block">
                        Productos Incluidos (Retirás en tu turno):
                      </span>
                      {attachedProducts.map((p, idx) => (
                        <strong
                          key={idx}
                          className="text-emerald-600 dark:text-emerald-400 block"
                        >
                          + {p.quantity}x {p.name} ($
                          {(p.unitPrice * p.quantity).toLocaleString('es-AR')})
                        </strong>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-[#a39b93]">Total Pagado:</span>
                    <strong className="text-slate-900 dark:text-[#f3ede4] text-sm">
                      ${grandTotalPaid.toLocaleString('es-AR')}
                    </strong>
                  </div>
                </div>
              )}

              {reschedulePolicy.enabled && appointmentData && (
                <div className="p-4 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-left space-y-3">
                  <div className="flex items-start gap-2.5 text-xs">
                    <RotateCcw className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                    <p className="text-slate-700 dark:text-[#f3ede4]/90 leading-relaxed">
                      <strong>¿Te surgió un imprevisto?</strong> Podés reprogramar tu turno sin cargo desde nuestra web hasta{' '}
                      <strong className="text-amber-600 dark:text-[#e3b964]">
                        {reschedulePolicy.minHoursBefore}{' '}
                        {reschedulePolicy.minHoursBefore === 1 ? 'hora' : 'horas'} antes
                      </strong>{' '}
                      de tu horario reservado.
                    </p>
                  </div>
                  <Link
                    href={`/mi-turno?appointmentId=${appointmentData.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#d4af37]/20 hover:bg-[#d4af37] text-[#9a7b22] dark:text-[#e3b964] hover:text-zinc-950 border border-[#d4af37]/35 transition-all min-h-[42px]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Gestionar o Reprogramar mi Turno</span>
                  </Link>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <a
                  href={`https://wa.me/${barberPhone}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold bg-[#4fbf84] hover:bg-emerald-500 text-zinc-950 shadow-md shadow-[#4fbf84]/20 transition-all min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Avisar a la Barbería por WhatsApp</span>
                </a>

                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-[#a39b93] hover:text-slate-900 dark:hover:text-[#f3ede4] hover:bg-slate-100 dark:hover:bg-[#1f1c22] transition-colors min-h-[44px]"
                >
                  <span>Volver al inicio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          ) : isFailure ? (
            <>
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-xs">
                <XCircle className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 mb-2">
                  Pago no concretado
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#f3ede4]">
                  No se pudo confirmar el turno
                </h1>
                <p className="text-xs text-slate-500 dark:text-[#a39b93] mt-1 max-w-sm mx-auto">
                  El pago fue cancelado o rechazado por Mercado Pago. El horario quedó liberado para que elijas otro momento.
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <Link
                  href="/reservar"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold bg-[#e3b964] hover:bg-[#d4a24e] text-[#0c0b0d] shadow-md shadow-[#e3b964]/20 transition-all min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Intentar reservar de nuevo</span>
                </Link>

                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center py-2.5 text-xs text-slate-500 dark:text-[#a39b93] hover:text-slate-900 dark:hover:text-[#f3ede4] min-h-[44px]"
                >
                  <span>Volver al inicio</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-[#e3b964]/10 border border-[#e3b964]/20 text-amber-600 dark:text-[#e3b964] flex items-center justify-center mx-auto shadow-xs">
                <Clock className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#e3b964]/10 text-amber-700 dark:text-[#e3b964] border border-[#e3b964]/20 mb-2">
                  Procesando Pago
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#f3ede4]">
                  Pago en verificación
                </h1>
                <p className="text-xs text-slate-500 dark:text-[#a39b93] mt-1 max-w-sm mx-auto">
                  Tu pago está siendo procesado por Mercado Pago. Te notificaremos apenas se acredite.
                </p>
              </div>

              <div className="pt-4">
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1f1c22] text-slate-800 dark:text-[#f3ede4] hover:bg-slate-200 dark:hover:bg-[#2c2830] transition-colors min-h-[44px]"
                >
                  <span>Volver al inicio</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="py-4 border-t border-slate-200 dark:border-[#2c2830] text-center text-[11px] text-slate-400 dark:text-[#a39b93]">
        Diogo Barber Shop • Catamarca • Barbería Masculina
      </footer>
    </div>
  );
}
