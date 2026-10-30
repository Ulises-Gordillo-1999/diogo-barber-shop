import { db } from '@/db';
import { businessHours, services } from '@/db/schema';
import { eq, asc, gte } from 'drizzle-orm';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { ArrowLeft, RotateCcw, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { syncPendingAppointments } from '@/utils/mercadopago';
import { getReschedulePolicy } from '@/app/actions/clientRescheduleActions';
import { getProductsAction } from '@/app/actions/productActions';
import { ensureExtendedSchema } from '@/db/ensureSchema';

export const dynamic = 'force-dynamic';

interface ReservarPageProps {
  searchParams: Promise<{
    serviceId?: string;
  }>;
}

export default async function ReservarPage({ searchParams }: ReservarPageProps) {
  const { serviceId } = await searchParams;
  await ensureExtendedSchema();
  await syncPendingAppointments();

  const [reschedulePolicy, activeServices, activeProducts, hoursList] =
    await Promise.all([
      getReschedulePolicy(),
      db
        .select()
        .from(services)
        .where(eq(services.active, true))
        .orderBy(asc(services.displayOrder)),
      getProductsAction(true),
      db
        .select()
        .from(businessHours)
        .where(gte(businessHours.dayOfWeek, 0)),
    ]);

  // Identificar qué días de la semana están cerrados (ej. Domingo = 0)
  const closedDaysOfWeek = hoursList
    .filter((h) => !h.isOpen)
    .map((h) => h.dayOfWeek);

  if (closedDaysOfWeek.length === 0 && !hoursList.some((h) => h.dayOfWeek === 0 && h.isOpen)) {
    closedDaysOfWeek.push(0); // Domingo cerrado por defecto
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#faf8f5] dark:bg-[#09090b] text-zinc-900 dark:text-[#f4efe6] bg-atelier-grid transition-colors">
      {/* Header Público */}
      <header className="border-b border-zinc-200 dark:border-zinc-800/80 px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between bg-[#faf8f5]/85 dark:bg-[#09090b]/85 backdrop-blur-xl sticky top-0 z-30">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-[#d4af37] py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[#d4af37]/50 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Volver al Estudio</span>
        </Link>

        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#9a7b2c] via-[#e5c158] to-[#9a7b2c] shrink-0">
            <img
              src="/images/logo-diogo.webp"
              alt="Diogo Barber Shop"
              className="w-full h-full rounded-full object-cover bg-zinc-950"
            />
          </div>
          <div className="text-left">
            <span className="font-serif font-bold text-base text-zinc-900 dark:text-[#f4efe6] block leading-none">
              DIOGO BARBER
            </span>
            <span className="font-mono text-[10px] text-[#b38f2d] dark:text-[#d4af37] font-semibold tracking-[0.22em] uppercase block mt-1">
              CONCIERGE DE RESERVAS
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/tienda"
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:text-[#d4af37] border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl transition-all min-h-[42px]"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Tienda</span>
          </Link>
          <Link
            href="/mi-turno"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] bg-[#d4af37]/10 hover:bg-[#d4af37] hover:text-zinc-950 border border-[#d4af37]/30 px-3 py-2 rounded-xl transition-all min-h-[42px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reprogramar Turno</span>
            <span className="sm:hidden">Mi Turno</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <BookingWizard
          services={activeServices}
          products={activeProducts}
          closedDaysOfWeek={closedDaysOfWeek}
          initialServiceId={serviceId}
          minRescheduleHours={reschedulePolicy.minHoursBefore}
        />
      </main>

      {/* Footer */}
      <footer className="py-5 border-t border-zinc-200 dark:border-zinc-800/80 text-center font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
        Diogo Barber Shop • Catamarca • Confirmación Instantánea con Mercado Pago
      </footer>
    </div>
  );
}
