import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  getReschedulePolicy,
  lookupClientAppointmentsAction,
} from '@/app/actions/clientRescheduleActions';
import { ClientReschedulePortal } from '@/components/booking/ClientReschedulePortal';

export const dynamic = 'force-dynamic';

interface MiTurnoPageProps {
  searchParams: Promise<{
    appointmentId?: string;
    phone?: string;
  }>;
}

export default async function MiTurnoPage({ searchParams }: MiTurnoPageProps) {
  const { appointmentId, phone } = await searchParams;
  const hasInitialQuery = Boolean(appointmentId || phone);

  const policy = await getReschedulePolicy();
  const initialLookup = hasInitialQuery
    ? await lookupClientAppointmentsAction({ appointmentId, phone })
    : {
        success: true,
        appointments: [],
        policy,
      };

  return (
    <div className="min-h-dvh flex flex-col bg-[#faf8f5] dark:bg-[#09090b] text-zinc-900 dark:text-[#f4efe6] transition-colors">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-[#09090b]/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider border border-zinc-200 dark:border-zinc-800 hover:border-[#d4af37] transition-colors min-h-[42px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Volver al Estudio</span>
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-[#d4af37]/50 bg-zinc-950 shrink-0">
              <img
                src="/images/logo-diogo.webp"
                alt="Diogo Barber Shop"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:block text-left">
              <span className="font-serif text-sm font-bold tracking-wide block leading-none">
                DIOGO BARBER
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37]">
                AUTOGESTIÓN DE TURNOS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#b38f2d] dark:text-[#d4af37] font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>AUTOGESTIÓN DE RESERVAS 24/7</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
            Gestioná o Reprogramá{' '}
            <span className="font-serif italic font-normal text-[#b38f2d] dark:text-[#d4af37]">
              tu turno online
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Cambiá tu horario abonado en segundos y sin esperas, eligiendo un nuevo hueco libre en la agenda de Diogo Barber Shop.
          </p>
        </div>

        <ClientReschedulePortal
          initialAppointments={initialLookup.appointments}
          initialPolicy={initialLookup.policy}
          initialPhone={
            phone || initialLookup.appointments[0]?.customerPhone || ''
          }
          hasInitialQuery={hasInitialQuery}
        />
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-zinc-200/80 dark:border-zinc-800/80 text-center text-xs text-zinc-400">
        Diogo Barber Shop • Catamarca, Argentina • Sistema de Autogestión Online
      </footer>
    </div>
  );
}

