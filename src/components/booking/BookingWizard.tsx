'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  fetchAvailableSlotsAction,
  createBookingAction,
} from '@/app/actions/bookingActions';
import type { Service } from '@/db/schema';
import type { TimeSlot } from '@/utils/availability';

interface BookingWizardProps {
  services: Service[];
  initialServiceId?: string;
  minRescheduleHours?: number;
}

export function BookingWizard({
  services,
  initialServiceId,
  minRescheduleHours = 2,
}: BookingWizardProps) {
  // Generar los próximos 14 días disponibles a partir de hoy
  const availableDates = Array.from({ length: 14 }).map((_, index) => {
    const d = new Date();
    d.setDate(d.getDate() + index);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(d);
    const dayNumber = d.getDate();
    const monthName = new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(d);
    return {
      dateStr,
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      dayNumber,
      monthName,
      isToday: index === 0,
    };
  });

  const preselected = initialServiceId
    ? services.find((s) => s.id === initialServiceId) || null
    : null;

  // Pasos del Wizard: 1 = Servicio, 2 = Fecha y Hora, 3 = Datos y Checkout
  const [step, setStep] = useState<1 | 2 | 3>(preselected ? 2 : 1);

  // Estados de Selección
  const [selectedService, setSelectedService] = useState<Service | null>(preselected);
  const [selectedDate, setSelectedDate] = useState<string>(
    availableDates[0]?.dateStr || ''
  );
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Estados del Formulario del Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Estados de Acción y Errores
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Al seleccionar servicio, setear fecha inicial
  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0].dateStr);
    }
    setStep(2);
    setErrorMessage(null);
  };

  // Cargar slots cuando cambie la fecha o el servicio
  useEffect(() => {
    if (step === 2 && selectedService && selectedDate) {
      setLoadingSlots(true);
      setSelectedTime('');
      fetchAvailableSlotsAction(selectedService.id, selectedDate)
        .then((slots) => {
          setAvailableSlots(slots);
        })
        .catch(() => {
          setAvailableSlots([]);
        })
        .finally(() => {
          setLoadingSlots(false);
        });
    }
  }, [step, selectedService, selectedDate]);

  // Manejar creación de reserva y redirección a Mercado Pago
  const handleSubmitBooking = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      setErrorMessage('Faltan datos de la reserva.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Por favor ingresá tu nombre y teléfono (WhatsApp).');
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await createBookingAction({
        serviceId: selectedService.id,
        dateStr: selectedDate,
        timeStr: selectedTime,
        customerName,
        customerPhone,
        customerNotes,
      });

      if (result.success && result.initPoint) {
        window.location.href = result.initPoint;
      } else {
        setErrorMessage(
          result.error || 'No se pudo generar la reserva. Intentá nuevamente.'
        );
      }
    });
  };

  return (
    <div className="w-full space-y-8">
      {/* Cabecera Editorial del Wizard */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-6 text-left">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b38f2d] dark:text-[#d4af37] font-semibold block mb-1.5">
            SISTEMA DE RESERVA EN VIVO
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
            Reservá tu{' '}
            <span className="font-serif italic font-normal text-[#b38f2d] dark:text-[#d4af37]">
              silla en el estudio
            </span>
          </h1>
        </div>

        {/* Stepper Arquitectónico */}
        <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-[#121115] p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          {[
            { num: 1, label: 'Servicio' },
            { num: 2, label: 'Día & Hora' },
            { num: 3, label: 'Confirmación' },
          ].map((s, idx) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs transition-all ${
                    isCurrent
                      ? 'bg-[#d4af37] text-zinc-950 font-bold shadow-xs'
                      : isDone
                      ? 'bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] font-semibold'
                      : 'text-zinc-400 dark:text-zinc-600'
                  }`}
                >
                  <span>0{s.num}</span>
                  <span className="hidden sm:inline font-sans">{s.label}</span>
                </div>
                {idx < 2 && (
                  <span className="text-zinc-300 dark:text-zinc-800 font-mono">/</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Banner de Error si existe */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 flex items-start gap-3 text-xs text-left"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Layout Asimétrico: Columna Principal (8 cols) + Pase Digital en Vivo (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUMNA IZQUIERDA: Pasos Interactivos */}
        <div className="lg:col-span-8 space-y-6 text-left">
          {/* PASO 1: Selección de Servicio */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-[#f4efe6] flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#d4af37]" />
                  <span>Paso 1: Seleccioná tu servicio</span>
                </h2>
                <span className="font-mono text-xs text-zinc-500">
                  {services.length} opciones disponibles
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {services.map((service, idx) => (
                  <div
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    className={`group p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                      selectedService?.id === service.id
                        ? 'border-[#d4af37] bg-[#d4af37]/10 shadow-md'
                        : 'border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#121115] hover:border-[#d4af37]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37]">
                            0{idx + 1}
                          </span>
                          <h3 className="text-lg font-extrabold text-zinc-900 dark:text-[#f4efe6] group-hover:text-[#b38f2d] dark:group-hover:text-[#d4af37] transition-colors">
                            {service.name}
                          </h3>
                        </div>
                        {service.description && (
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#b38f2d] dark:text-[#d4af37] block">
                          ${Number(service.price).toLocaleString('es-AR')}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                          <Clock className="w-3 h-3 text-[#d4af37]" />
                          {service.durationMinutes} MIN
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        ● Turnos libres hoy
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Elegir Horario <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: Selección de Fecha y Horario */}
          {step === 2 && selectedService && (
            <div className="space-y-6 bg-white dark:bg-[#121115] p-5 sm:p-7 rounded-3xl border border-zinc-200 dark:border-zinc-800/90">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-[#f4efe6] flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#d4af37]" />
                    <span>Paso 2: Elegí Día y Horario</span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Mostrando bloques de {selectedService.durationMinutes} minutos para{' '}
                    <strong className="text-zinc-900 dark:text-[#f4efe6]">
                      {selectedService.name}
                    </strong>
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-[#d4af37] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors min-h-[40px] flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cambiar</span>
                </button>
              </div>

              {/* Selector de Días Horizontal */}
              <div className="space-y-2.5">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  1. Seleccioná el día:
                </span>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                  {availableDates.map((d) => {
                    const isSelected = selectedDate === d.dateStr;
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => setSelectedDate(d.dateStr)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[74px] min-h-[78px] border shrink-0 transition-all snap-start cursor-pointer ${
                          isSelected
                            ? 'border-[#d4af37] bg-[#d4af37] text-zinc-950 font-bold shadow-lg shadow-[#d4af37]/20'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-300 hover:border-[#d4af37]/50'
                        }`}
                      >
                        <span className="font-mono text-[10px] uppercase tracking-wider">
                          {d.dayName}
                        </span>
                        <span className="font-mono text-xl font-extrabold my-0.5">
                          {d.dayNumber}
                        </span>
                        <span className="font-mono text-[10px] uppercase opacity-80">
                          {d.monthName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grilla de Horarios Libres */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    2. Seleccioná un horario disponible:
                  </span>
                  <span className="font-mono text-[11px] text-[#b38f2d] dark:text-[#d4af37]">
                    Horario Catamarca
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="p-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center gap-2.5">
                    <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
                    <span className="font-mono text-xs text-zinc-500">
                      Sincronizando agenda en tiempo real...
                    </span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-center space-y-1.5">
                    <CalendarIcon className="w-7 h-7 text-zinc-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      Sin turnos disponibles para esta fecha
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      El estudio permanece cerrado los domingos o la agenda del día ya se
                      encuentra completa. Probá con el día siguiente.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => {
                            setSelectedTime(slot.time);
                            setErrorMessage(null);
                          }}
                          className={`py-3 px-2 rounded-xl font-mono text-xs font-bold transition-all min-h-[46px] flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[#d4af37] text-zinc-950 shadow-md shadow-[#d4af37]/25 ring-2 ring-[#d4af37]'
                              : slot.available
                              ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-[#f4efe6] border border-zinc-200 dark:border-zinc-800 hover:border-[#d4af37]/60 cursor-pointer'
                              : 'bg-zinc-100/60 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-600 border border-transparent cursor-not-allowed opacity-45 line-through'
                          }`}
                        >
                          <span>{slot.time} hs</span>
                          {!slot.available && (
                            <span className="text-[9px] font-sans font-normal no-underline mt-0.5">
                              Ocupado
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botón Siguiente a Paso 3 */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button
                  type="button"
                  disabled={!selectedTime}
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-xs font-bold uppercase tracking-wider bg-[#d4af37] hover:bg-[#e5c158] text-zinc-950 shadow-lg shadow-[#d4af37]/20 disabled:opacity-40 transition-all min-h-[48px] cursor-pointer"
                >
                  <span>Continuar con mis datos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Datos del Cliente y Cobro Mercado Pago */}
          {step === 3 && selectedService && selectedDate && selectedTime && (
            <div className="space-y-6 bg-white dark:bg-[#121115] p-5 sm:p-7 rounded-3xl border border-zinc-200 dark:border-zinc-800/90">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-[#f4efe6] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#d4af37]" />
                    <span>Paso 3: Tus Datos & Pago Seguro</span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Sin creación de cuenta ni contraseñas
                  </p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-[#d4af37] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors min-h-[40px] flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cambiar hora</span>
                </button>
              </div>

              {/* Formulario de Datos Mínimos */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="name"
                    className="block text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
                  >
                    Nombre y Apellido <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej: Gabriel Estani"
                      className="w-full pl-10 pr-3.5 py-3.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] placeholder:text-zinc-400 focus:ring-2 focus:ring-[#d4af37] focus:outline-none min-h-[46px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="block text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
                  >
                    WhatsApp (Celular) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Ej: 3834 064982"
                      className="w-full pl-10 pr-3.5 py-3.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] placeholder:text-zinc-400 focus:ring-2 focus:ring-[#d4af37] focus:outline-none min-h-[46px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="notes"
                    className="block text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
                  >
                    Indicaciones para el barbero (opcional)
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Ej: Degradado medio, perfilado con navaja..."
                    className="w-full p-3.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] placeholder:text-zinc-400 focus:ring-2 focus:ring-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Aviso de Bloqueo de 10 min */}
              <div className="p-4 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-xs flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#b38f2d] dark:text-[#d4af37] shrink-0 mt-0.5" />
                <span className="leading-relaxed text-zinc-700 dark:text-zinc-300">
                  Al presionar <strong>&ldquo;Pagar y Confirmar Turno&rdquo;</strong>, el sistema
                  reserva este horario para vos durante <strong>10 minutos</strong> mientras
                  finalizás el pago en Mercado Pago.
                </span>
              </div>

              {/* Botón Final de Pago */}
              <button
                type="button"
                disabled={isPending}
                onClick={handleSubmitBooking}
                className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-xl shadow-[#d4af37]/20 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99] min-h-[54px] cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Bloqueando horario y abriendo Mercado Pago...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>
                      Pagar y Confirmar Turno ($
                      {Number(selectedService.price).toLocaleString('es-AR')})
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Pase de Turno Digital en Vivo (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="rounded-3xl bg-zinc-950 text-[#f4efe6] border border-[#d4af37]/40 p-6 shadow-2xl space-y-5 text-left relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/images/logo-diogo.webp"
                  alt="Diogo Barber Shop"
                  className="w-10 h-10 rounded-full object-cover border border-[#d4af37]/50"
                />
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#d4af37] block">
                    TICKET DE RESERVA
                  </span>
                  <span className="font-bold text-sm text-white block">
                    Diogo Barber Shop
                  </span>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
            </div>

            <div className="space-y-3.5 font-mono text-xs">
              <div className="flex justify-between items-start gap-2 border-b border-dashed border-zinc-800 pb-3">
                <span className="text-zinc-500 uppercase">Servicio:</span>
                <span className="text-white font-bold text-right">
                  {selectedService ? selectedService.name : 'Pendiente de elegir'}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2 border-b border-dashed border-zinc-800 pb-3">
                <span className="text-zinc-500 uppercase">Duración:</span>
                <span className="text-zinc-300">
                  {selectedService ? `${selectedService.durationMinutes} min` : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2 border-b border-dashed border-zinc-800 pb-3">
                <span className="text-zinc-500 uppercase">Fecha:</span>
                <span className="text-white font-semibold">
                  {selectedDate || '—'}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2 border-b border-dashed border-zinc-800 pb-3">
                <span className="text-zinc-500 uppercase">Horario:</span>
                <span className="text-[#d4af37] font-bold">
                  {selectedTime ? `${selectedTime} hs` : 'Elegí una hora'}
                </span>
              </div>

              {customerName && (
                <div className="flex justify-between items-center gap-2 border-b border-dashed border-zinc-800 pb-3">
                  <span className="text-zinc-500 uppercase">Cliente:</span>
                  <span className="text-white truncate max-w-[160px]">
                    {customerName}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-1 flex items-baseline justify-between">
              <span className="font-mono text-xs uppercase text-zinc-400">
                Total a Abonar:
              </span>
              <span className="font-mono text-2xl font-extrabold text-[#d4af37]">
                {selectedService
                  ? `$${Number(selectedService.price).toLocaleString('es-AR')}`
                  : '$0'}
              </span>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Confirmación automática en agenda</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                <span>
                  Reprogramación sin cargo hasta {minRescheduleHours}{' '}
                  {minRescheduleHours === 1 ? 'hora' : 'horas'} antes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Tolerancia de espera: 10 minutos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
