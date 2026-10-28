'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { simulatePaymentAction } from '@/app/actions/devActions';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AppointmentData {
  id: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  status: string;
  expiresAt: string | null;
  price: string;
  serviceName: string;
}

export function CheckoutSimulatorClient({
  appointment,
}: {
  appointment: AppointmentData;
}) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number>(600); // 10 minutos iniciales
  const [isPending, startTransition] = useTransition();

  // Reloj regresivo basado en expiresAt
  useEffect(() => {
    if (!appointment.expiresAt) return;

    const targetTime = new Date(appointment.expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((targetTime - now) / 1000));
      setSecondsLeft(diffSeconds);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [appointment.expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleSimulate = (outcome: 'approved' | 'rejected') => {
    startTransition(async () => {
      const res = await simulatePaymentAction(appointment.id, outcome);
      if (res.success) {
        if (outcome === 'approved') {
          router.push(
            `/confirmacion?appointmentId=${appointment.id}&status=approved`
          );
        } else {
          router.push(
            `/confirmacion?appointmentId=${appointment.id}&status=rejected`
          );
        }
      } else {
        alert(res.error || 'Error al procesar la simulación');
      }
    });
  };

  const startDate = new Date(appointment.startTime);
  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(startDate);

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors p-4 sm:p-6">
      {/* Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-xs sm:text-sm tracking-tight block">
              Mercado Pago • Checkout Pro
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
              Modo Simulador de Pruebas
            </span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Tarjeta Central */}
      <main className="flex-1 flex items-center justify-center py-6">
        <div className="w-full max-w-lg bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Banner de Expiración con Cronómetro */}
          <div
            className={`p-4 rounded-2xl flex items-center justify-between border ${
              secondsLeft > 120
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-900 dark:text-rose-200 animate-pulse'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold block">
                  Bloqueo Temporal Activo (10 min)
                </span>
                <span className="text-[11px] opacity-80">
                  El turno está reservado mientras abonás
                </span>
              </div>
            </div>

            <span className="text-2xl font-black font-mono tracking-wider">
              {timeFormatted}
            </span>
          </div>

          {/* Resumen del Pago */}
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                Servicio a abonar:
              </span>
              <strong className="text-xs text-slate-900 dark:text-zinc-100 font-bold">
                {appointment.serviceName}
              </strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                Fecha y Hora:
              </span>
              <strong className="text-xs text-slate-900 dark:text-zinc-100 capitalize">
                {formattedDate} hs
              </strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                Cliente:
              </span>
              <strong className="text-xs text-slate-900 dark:text-zinc-100">
                {appointment.customerName} ({appointment.customerPhone})
              </strong>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                Total 100% Cobro Anticipado:
              </span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                ${Number(appointment.price).toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          {/* Explicación Técnica */}
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs text-left space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>¿Por qué ves este simulador en lugar de Mercado Pago?</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              En tu archivo <code>.env</code> está configurado el token de prueba local.
              Para ir a la pasarela real de Mercado Pago, solo debés colocar tu{' '}
              <code>MERCADOPAGO_ACCESS_TOKEN</code> de Mercado Pago Developers.
            </p>
          </div>

          {/* Botones de Simulación de Pago */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={isPending || secondsLeft === 0}
              onClick={() => handleSimulate('approved')}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all min-h-[48px] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando acreditación...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simular Pago Exitoso (Tarjeta Aprobada)</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSimulate('rejected')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all min-h-[44px] cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Simular Pago Rechazado / Cancelar</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer con enlace a Developers */}
      <footer className="text-center text-[11px] text-slate-400 dark:text-zinc-500 py-2 flex items-center justify-center gap-2">
        <span>Diogo Barber Shop</span>
        <span>•</span>
        <a
          href="https://www.mercadopago.com.ar/developers/panel"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-500 hover:underline"
        >
          <span>Panel de Mercado Pago Developers</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </footer>
    </div>
  );
}
