import { db } from '@/db';
import { services } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { syncPendingAppointments } from '@/utils/mercadopago';

export const dynamic = 'force-dynamic';

interface ReservarPageProps {
  searchParams: Promise<{
    serviceId?: string;
  }>;
}

export default async function ReservarPage({ searchParams }: ReservarPageProps) {
  const { serviceId } = await searchParams;
  await syncPendingAppointments();

  const activeServices = await db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.displayOrder));

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

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Pago Seguro
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <BookingWizard services={activeServices} initialServiceId={serviceId} />
      </main>

      {/* Footer */}
      <footer className="py-5 border-t border-zinc-200 dark:border-zinc-800/80 text-center font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
        Diogo Barber Shop • Catamarca • Confirmación Instantánea con Mercado Pago
      </footer>
    </div>
  );
}
