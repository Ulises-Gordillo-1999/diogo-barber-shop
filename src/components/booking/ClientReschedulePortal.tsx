'use client';

import { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Calendar,
  Clock,
  Scissors,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  MessageCircle,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Phone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  lookupClientAppointmentsAction,
  clientSelfRescheduleAction,
  type ClientAppointmentDTO,
  type ReschedulePolicy,
} from '@/app/actions/clientRescheduleActions';
import { fetchAvailableSlotsAction } from '@/app/actions/bookingActions';
import type { TimeSlot } from '@/utils/availability';
import { getArgentinaCalendarDays } from '@/utils/dateHelpers';

interface ClientReschedulePortalProps {
  initialAppointments: ClientAppointmentDTO[];
  initialPolicy: ReschedulePolicy;
  initialPhone?: string;
  hasInitialQuery?: boolean;
}

export function ClientReschedulePortal({
  initialAppointments,
  initialPolicy,
  initialPhone = '',
  hasInitialQuery = false,
}: ClientReschedulePortalProps) {
  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [appointments, setAppointments] =
    useState<ClientAppointmentDTO[]>(initialAppointments);
  const [policy, setPolicy] = useState<ReschedulePolicy>(initialPolicy);
  const [searched, setSearched] = useState(hasInitialQuery);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Estado de reprogramación activa
  const [activeApp, setActiveApp] = useState<ClientAppointmentDTO | null>(
    initialAppointments.length === 1 && initialAppointments[0].canRescheduleNow
      ? initialAppointments[0]
      : null
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduledSuccess, setRescheduledSuccess] =
    useState<ClientAppointmentDTO | null>(null);

  const [isPending, startTransition] = useTransition();

  // Próximos 30 días en zona horaria estricta de Catamarca / Argentina
  const nextDates = getArgentinaCalendarDays(30, [0]).map((d) => ({
    dateStr: d.dateStr,
    dayLabel: d.dayName.toUpperCase(),
    dayNum: d.dayNumber,
    monthLabel: d.monthName.toUpperCase(),
    isClosed: d.isClosed,
  }));

  const rescheduleDatesScrollRef = useRef<HTMLDivElement>(null);

  const scrollRescheduleDates = (direction: 'left' | 'right') => {
    if (rescheduleDatesScrollRef.current) {
      const scrollAmount = Math.max(240, Math.floor(rescheduleDatesScrollRef.current.clientWidth * 0.7));
      rescheduleDatesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setRescheduledSuccess(null);
    setActiveApp(null);

    startTransition(async () => {
      const res = await lookupClientAppointmentsAction({ phone: phoneInput });
      setSearched(true);
      setPolicy(res.policy);
      if (res.success) {
        setAppointments(res.appointments);
      } else {
        setAppointments([]);
        setSearchError(res.error || 'No se encontraron turnos.');
      }
    });
  };

  const openRescheduleSelector = (app: ClientAppointmentDTO) => {
    setActiveApp(app);
    setRescheduleError(null);
    setRescheduledSuccess(null);
    const firstDate = nextDates[0]?.dateStr || '';
    setSelectedDate(firstDate);
    setSelectedTime('');
    if (firstDate) {
      loadSlotsForDate(app.serviceId, firstDate);
    }
  };

  const loadSlotsForDate = (serviceId: string, dateStr: string) => {
    setLoadingSlots(true);
    setSelectedTime('');
    fetchAvailableSlotsAction(serviceId, dateStr)
      .then((s) => setSlots(s))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (activeApp) {
      loadSlotsForDate(activeApp.serviceId, dateStr);
    }
  };

  const handleConfirmReschedule = () => {
    if (!activeApp || !selectedDate || !selectedTime) {
      setRescheduleError('Por favor elegí un día y un horario disponible.');
      return;
    }

    setRescheduleError(null);
    startTransition(async () => {
      const res = await clientSelfRescheduleAction({
        appointmentId: activeApp.id,
        customerPhone: activeApp.customerPhone,
        newDateStr: selectedDate,
        newTimeStr: selectedTime,
      });

      if (res.success && res.updatedAppointment) {
        const updated = res.updatedAppointment;
        setAppointments((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        setRescheduledSuccess(updated);
        setActiveApp(null);
      } else {
        setRescheduleError(
          res.error || 'No se pudo reprogramar el turno. Intentá con otro horario.'
        );
      }
    });
  };

  const formatAppDateTime = (iso: string) => {
    const dt = new Date(iso);
    const datePart = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Argentina/Catamarca',
    }).format(dt);
    const timePart = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Catamarca',
    }).format(dt);
    return { datePart, timePart };
  };

  const barberPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '5493834064982';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Banner de Regla de Anticipación Configurada por Diogo */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#b38f2d] dark:text-[#d4af37] shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="text-xs sm:text-sm space-y-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37] block">
            POLÍTICA DE REPROGRAMACIÓN SIN CARGO
          </span>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Si ya abonaste tu turno y te surgió un imprevisto, podés cambiar el día o la hora automáticamente desde acá hasta{' '}
            <strong className="text-zinc-950 dark:text-[#d4af37] font-extrabold">
              {policy.minHoursBefore}{' '}
              {policy.minHoursBefore === 1 ? 'hora' : 'horas'} antes
            </strong>{' '}
            de tu horario reservado, sin costo adicional.
          </p>
        </div>
      </div>

      {/* Buscador por WhatsApp */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#111014] border border-zinc-200/90 dark:border-zinc-800/90 shadow-lg space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-zinc-950 dark:text-[#f4efe6]">
            Buscá tu reserva activa
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Ingresá el mismo número de WhatsApp que usaste al reservar tu turno.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Phone className="w-4 h-4 text-[#d4af37] absolute left-4 top-3.5" />
            <input
              type="tel"
              required
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Ej: 3834238349"
              className="w-full pl-11 pr-4 py-3 text-base sm:text-sm font-mono rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] focus:ring-2 focus:ring-[#d4af37] focus:outline-none min-h-[48px]"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-lg shadow-[#d4af37]/20 transition-all min-h-[48px] cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>Buscar mi Turno</span>
          </button>
        </form>

        {searchError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Confirmación de Reprogramación Exitosa */}
      {rescheduledSuccess && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111014] border-2 border-emerald-500/40 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
              Cambio Confirmado sin Cargo
            </span>
            <h3 className="text-2xl font-extrabold text-zinc-950 dark:text-[#f4efe6]">
              ¡Tu turno fue reprogramado!
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Ya actualizamos la agenda de Diogo Barber Shop y liberamos tu horario anterior.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-left space-y-2.5 text-xs max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-zinc-500">Cliente:</span>
              <strong className="text-zinc-900 dark:text-[#f4efe6]">
                {rescheduledSuccess.customerName}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Servicio:</span>
              <strong className="text-zinc-900 dark:text-[#f4efe6]">
                {rescheduledSuccess.serviceName}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Nuevo Día y Hora:</span>
              <strong className="text-[#b38f2d] dark:text-[#d4af37] capitalize">
                {formatAppDateTime(rescheduledSuccess.startTime).datePart} a las{' '}
                {formatAppDateTime(rescheduledSuccess.startTime).timePart} hs
              </strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
            <a
              href={`https://wa.me/${barberPhone}?text=${encodeURIComponent(
                `¡Hola Diogo! Reprogramé mi turno abonado de ${rescheduledSuccess.serviceName} desde la web para el ${
                  formatAppDateTime(rescheduledSuccess.startTime).datePart
                } a las ${
                  formatAppDateTime(rescheduledSuccess.startTime).timePart
                } hs. Mi nombre es ${rescheduledSuccess.customerName}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all min-h-[46px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar aviso por WhatsApp</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-xs font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 min-h-[46px]"
            >
              <span>Volver al Inicio</span>
            </Link>
          </div>
        </div>
      )}

      {/* Listado de Turnos Encontrados */}
      {searched && appointments.length === 0 && !searchError && (
        <div className="p-10 rounded-3xl bg-white dark:bg-[#111014] border border-zinc-200/90 dark:border-zinc-800/90 text-center space-y-3">
          <Calendar className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-base font-extrabold text-zinc-900 dark:text-[#f4efe6]">
            No encontramos turnos futuros activos con ese número
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Verificá que el número sea el mismo que ingresaste al reservar o reservá un nuevo turno online.
          </p>
          <div className="pt-2">
            <Link
              href="/reservar"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-[#d4af37] text-zinc-950 min-h-[44px]"
            >
              <Scissors className="w-4 h-4" />
              <span>Reservar Nuevo Turno</span>
            </Link>
          </div>
        </div>
      )}

      {appointments.map((app) => {
        const { datePart, timePart } = formatAppDateTime(app.startTime);
        const isEditingThis = activeApp?.id === app.id;

        return (
          <div
            key={app.id}
            className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#111014] border border-zinc-200/90 dark:border-zinc-800/90 shadow-md space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    <ShieldCheck className="w-3 h-3" />
                    Pago 100% Acreditado
                  </span>
                  {app.status === 'RESCHEDULED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30">
                      Reprogramado
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-zinc-950 dark:text-[#f4efe6] mt-1.5">
                  {app.serviceName}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Titular: <strong className="text-zinc-800 dark:text-zinc-200">{app.customerName}</strong> • WhatsApp: {app.customerPhone}
                </p>
              </div>

              <div className="sm:text-right bg-zinc-50 dark:bg-zinc-900/90 px-4 py-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block">
                  HORARIO ACTUAL
                </span>
                <span className="font-mono text-base font-extrabold text-[#b38f2d] dark:text-[#d4af37] capitalize block">
                  {datePart}
                </span>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-[#f4efe6] block">
                  {timePart} hs
                </span>
              </div>
            </div>

            {/* Estado de elegibilidad para reprogramar */}
            {app.canRescheduleNow ? (
              !isEditingThis ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Estás dentro del plazo permitido (hasta{' '}
                    <strong>{policy.minHoursBefore} hs antes</strong> del turno).
                  </p>
                  <button
                    type="button"
                    onClick={() => openRescheduleSelector(app)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-md shadow-[#d4af37]/20 min-h-[46px] cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Cambiar Día / Horario</span>
                  </button>
                </div>
              ) : (
                /* Selector interactivo de nueva fecha y hora */
                <div className="pt-2 space-y-5 border-t border-zinc-100 dark:border-zinc-800/80">
                  {rescheduleError && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{rescheduleError}</span>
                    </div>
                  )}

                  {/* 1. Elegir nuevo día */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] block">
                        1. ELEGÍ EL NUEVO DÍA:
                      </label>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-[11px] text-zinc-400 hidden sm:inline">
                          Navegar:
                        </span>
                        <div className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/90 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => scrollRescheduleDates('left')}
                            aria-label="Ver días anteriores"
                            title="Días anteriores"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-[#d4af37] hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollRescheduleDates('right')}
                            aria-label="Ver siguientes días"
                            title="Días siguientes"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-[#d4af37] hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="relative group/scroll">
                      {/* Botón flotante Izquierdo Desktop */}
                      <button
                        type="button"
                        onClick={() => scrollRescheduleDates('left')}
                        aria-label="Desplazar a la izquierda"
                        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-950/95 dark:bg-black/95 border border-[#d4af37]/50 text-[#d4af37] shadow-lg items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                      </button>

                      <div
                        ref={rescheduleDatesScrollRef}
                        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x scroll-smooth"
                      >
                        {nextDates.map((d) => {
                          const active = selectedDate === d.dateStr;
                          return (
                            <button
                              key={d.dateStr}
                              type="button"
                              disabled={d.isClosed}
                              onClick={() => handleSelectDate(d.dateStr)}
                              className={`flex flex-col items-center justify-center min-w-[68px] py-2.5 px-3 rounded-2xl border transition-all shrink-0 snap-start ${
                                d.isClosed
                                  ? 'bg-zinc-100/60 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 text-zinc-400 dark:text-zinc-600 opacity-50 cursor-not-allowed'
                                  : active
                                  ? 'bg-[#d4af37] border-[#d4af37] text-zinc-950 font-extrabold shadow-md cursor-pointer'
                                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-[#d4af37]/50 cursor-pointer'
                              }`}
                            >
                              <span className="font-mono text-[10px] opacity-80">
                                {d.dayLabel}
                              </span>
                              <span className="font-mono text-lg font-extrabold leading-tight">
                                {d.dayNum}
                              </span>
                              <span className="font-mono text-[9px] opacity-75">
                                {d.isClosed ? 'CERRADO' : d.monthLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Botón flotante Derecho Desktop */}
                      <button
                        type="button"
                        onClick={() => scrollRescheduleDates('right')}
                        aria-label="Desplazar a la derecha"
                        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-950/95 dark:bg-black/95 border border-[#d4af37]/50 text-[#d4af37] shadow-lg items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Elegir nuevo horario libre */}
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] block">
                      2. ELEGÍ EL NUEVO HORARIO DISPONIBLE:
                    </label>

                    {loadingSlots ? (
                      <div className="p-8 text-center flex items-center justify-center gap-2 text-xs text-zinc-400">
                        <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
                        <span>Consultando horarios libres en vivo...</span>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 text-center text-xs text-zinc-500">
                        El estudio permanece cerrado o sin cupos en esta fecha. Probá con otro día.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {slots.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`py-3 px-2 rounded-2xl font-mono text-xs font-bold border transition-all min-h-[46px] ${
                                isSelected
                                  ? 'bg-[#d4af37] border-[#d4af37] text-zinc-950 shadow-md cursor-pointer'
                                  : slot.available
                                  ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-[#f4efe6] hover:border-[#d4af37] cursor-pointer'
                                  : 'opacity-30 bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-400 cursor-not-allowed'
                              }`}
                            >
                              {slot.time} hs
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveApp(null)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 min-h-[44px] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!selectedTime || isPending}
                      onClick={handleConfirmReschedule}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 disabled:opacity-40 shadow-lg shadow-[#d4af37]/20 min-h-[44px] cursor-pointer"
                    >
                      {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Confirmar Nuevo Horario</span>
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Faltan menos de <strong>{policy.minHoursBefore} hs</strong> para tu turno. El cambio automático online ya cerró para proteger la agenda del barbero.
                  </span>
                </div>
                <a
                  href={`https://wa.me/${barberPhone}?text=${encodeURIComponent(
                    `Hola Diogo, tengo turno hoy a las ${timePart} hs a nombre de ${app.customerName} y quería consultarte por un imprevisto.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold bg-emerald-500 text-zinc-950 shrink-0 min-h-[42px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

