import { db } from '@/db';
import { appointments, services } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { syncPendingAppointments } from '@/utils/mercadopago';
import { getReschedulePolicy } from '@/app/actions/clientRescheduleActions';

interface ConfirmacionPageProps {
  searchParams: Promise<{
    appointmentId?: string;
    status?: string;
    collection_status?: string;
  }>;
}

export default async function ConfirmacionPage({ searchParams }: ConfirmacionPageProps) {
  const {
    appointmentId,
    status,
    collection_status,
  } = await searchParams;

  // Reconciliación segura server-to-server contra la API oficial de Mercado Pago
  await syncPendingAppointments();
  const reschedulePolicy = await getReschedulePolicy();

  let appointmentData: {
    id: string;
    customerName: string;
    customerPhone: string;
    startTime: Date;
    endTime: Date;
    status: string;
    price: string;
    serviceName: string | null;
  } | null = null;

  if (appointmentId) {
    const list = await db
      .select({
        id: appointments.id,
        customerName: appointments.customerName,
        customerPhone: appointments.customerPhone,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        price: appointments.price,
        serviceName: services.name,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (list[0]) {
      appointmentData = list[0];
    }
  }

  // El turno se muestra como confirmado únicamente si en la base de datos figura CONFIRMED o RESCHEDULED
  const isApproved =
    appointmentData?.status === 'CONFIRMED' ||
    appointmentData?.status === 'RESCHEDULED';
  const isFailure =
    appointmentData?.status === 'CANCELLED' ||
    status === 'failure' ||
    status === 'rejected' ||
    collection_status === 'rejected';

  // Fecha y hora formateadas en español con zona horaria de Argentina
  const formattedDate = appointmentData
    ? new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Argentina/Catamarca',
      }).format(new Date(appointmentData.startTime))
    : '';

  const formattedTime = appointmentData
    ? new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Argentina/Catamarca',
      }).format(new Date(appointmentData.startTime))
    : '';

  const barberPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '5493834064982';
  const whatsappMsg = encodeURIComponent(
    `¡Hola Diogo! Acabo de confirmar y abonar mi turno para ${appointmentData?.serviceName || 'Corte'} el ${formattedDate} a las ${formattedTime} hs. Mi nombre es ${appointmentData?.customerName || ''}.`
  );

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-[#0c0b0d] text-slate-900 dark:text-[#f3ede4] transition-colors">
      {/* Header */}
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

      {/* Contenido Principal */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white dark:bg-[#161419] border border-slate-200 dark:border-[#2c2830] rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          {isApproved ? (
            <>
              {/* Icono de Éxito */}
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-2">
                  Pago Acreditado al 100%
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#f3ede4]">
                  ¡Turno Confirmado!
                </h1>
                <p className="text-xs text-slate-500 dark:text-[#a39b93] mt-1 max-w-sm mx-auto">
                  Tu turno fue reservado con éxito en Diogo Barber Shop. Ya te estamos esperando.
                </p>
              </div>

              {/* Detalle de la Cita */}
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
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2c2830] pb-2">
                    <span className="text-slate-500 dark:text-[#a39b93]">Fecha y Hora:</span>
                    <strong className="text-amber-600 dark:text-[#e3b964] capitalize">
                      {formattedDate} a las {formattedTime} hs
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-[#a39b93]">Total Pagado:</span>
                    <strong className="text-slate-900 dark:text-[#f3ede4] text-sm">
                      ${Number(appointmentData.price).toLocaleString('es-AR')}
                    </strong>
                  </div>
                </div>
              )}

              {/* Aviso de Política de Reprogramación Dinámica */}
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

              {/* Botón de Contacto por WhatsApp */}
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
              {/* Icono de Cancelado/Rechazado */}
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
              {/* Estado Pendiente */}
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

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 dark:border-[#2c2830] text-center text-[11px] text-slate-400 dark:text-[#a39b93]">
        Diogo Barber Shop • Catamarca • Barbería Masculina
      </footer>
    </div>
  );
}
