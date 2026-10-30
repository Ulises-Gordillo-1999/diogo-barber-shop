'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
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
  Users,
  Plus,
  Trash2,
  ShoppingBag,
} from 'lucide-react';
import {
  fetchAvailableSlotsAction,
  createBookingAction,
} from '@/app/actions/bookingActions';
import { getArgentinaCalendarDays } from '@/utils/dateHelpers';
import type { Service, Product } from '@/db/schema';
import type { TimeSlot } from '@/utils/availability';

interface BookingWizardProps {
  services: Service[];
  products?: Product[];
  closedDaysOfWeek?: number[];
  initialServiceId?: string;
  minRescheduleHours?: number;
}

interface SelectedSlotEntry {
  dateStr: string;
  timeStr: string;
  label: string;
}

export function BookingWizard({
  services,
  products = [],
  closedDaysOfWeek = [0],
  initialServiceId,
  minRescheduleHours = 2,
}: BookingWizardProps) {
  // Generar los próximos 30 días en zona horaria estricta de Catamarca / Argentina
  // (corrige el salto de fecha UTC pasadas las 21:00 hs y bloquea días cerrados como Domingo)
  const availableDates = useMemo(
    () => getArgentinaCalendarDays(30, closedDaysOfWeek),
    [closedDaysOfWeek]
  );

  const firstOpenDate = useMemo(
    () => availableDates.find((d) => !d.isClosed)?.dateStr || availableDates[0]?.dateStr || '',
    [availableDates]
  );

  const preselected = initialServiceId
    ? services.find((s) => s.id === initialServiceId) || null
    : null;

  // Pasos del Wizard: 1 = Servicio, 2 = Fecha y Hora (1 o varios turnos), 3 = Sugerencia Productos + Datos y Checkout
  const [step, setStep] = useState<1 | 2 | 3>(preselected ? 2 : 1);

  // Modalidad rápida de reserva: Individual, Con Amigo (2 turnos), o Pack Mensual (3-4 cortes)
  const [bookingMode, setBookingMode] = useState<'SINGLE' | 'FRIENDS' | 'MONTHLY'>('SINGLE');

  // Estados de Selección
  const [selectedService, setSelectedService] = useState<Service | null>(preselected);
  const [selectedDate, setSelectedDate] = useState<string>(firstOpenDate);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlotEntry[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Productos sugeridos sumados al turno (Upselling)
  const [attachedProducts, setAttachedProducts] = useState<Record<string, number>>({});

  // Estados del Formulario del Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Estados de Acción y Errores
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Productos recomendados según el servicio elegido
  const suggestedProductsForService = useMemo(() => {
    if (!selectedService || products.length === 0) return [];

    let explicitIds: string[] = [];
    try {
      explicitIds = JSON.parse(selectedService.suggestedProductIds || '[]');
    } catch {
      explicitIds = [];
    }

    if (explicitIds.length > 0) {
      const matched = products.filter((p) => explicitIds.includes(p.id) && p.stock > 0);
      if (matched.length > 0) return matched;
    }

    // Fallback inteligente por nombre de servicio
    const lower = selectedService.name.toLowerCase();
    if (lower.includes('corte') && lower.includes('barba')) {
      return products.filter((p) => p.stock > 0);
    }
    if (lower.includes('barba')) {
      return products.filter(
        (p) => (p.category === 'BEARD' || p.category === 'COMBO') && p.stock > 0
      );
    }
    return products.filter(
      (p) => (p.category === 'HAIR' || p.category === 'COMBO') && p.stock > 0
    );
  }, [selectedService, products]);

  // Totales calculados en tiempo real
  const totals = useMemo(() => {
    const slotsCount = Math.max(1, selectedSlots.length);
    const unitServicePrice = selectedService ? Number(selectedService.price) : 0;
    const appointmentsTotal =
      selectedSlots.length > 0 ? selectedSlots.length * unitServicePrice : unitServicePrice;

    let productsTotal = 0;
    const addedProductsList: Array<{ product: Product; quantity: number }> = [];

    for (const [prodId, qty] of Object.entries(attachedProducts)) {
      if (qty <= 0) continue;
      const found = products.find((p) => p.id === prodId);
      if (!found) continue;
      productsTotal += Number(found.price) * qty;
      addedProductsList.push({ product: found, quantity: qty });
    }

    return {
      slotsCount,
      appointmentsTotal,
      productsTotal,
      grandTotal: appointmentsTotal + productsTotal,
      addedProductsList,
    };
  }, [selectedService, selectedSlots, attachedProducts, products]);

  // Al seleccionar servicio, setear fecha inicial abierta
  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    if (!selectedDate) {
      setSelectedDate(firstOpenDate);
    }
    setStep(2);
    setErrorMessage(null);
  };

  // Cargar slots cuando cambie la fecha o el servicio
  useEffect(() => {
    if (step === 2 && selectedService && selectedDate) {
      const dayObj = availableDates.find((d) => d.dateStr === selectedDate);
      if (dayObj?.isClosed) {
        setAvailableSlots([]);
        return;
      }

      setLoadingSlots(true);
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
  }, [step, selectedService, selectedDate, availableDates]);

  // Seleccionar o agregar un horario según la modalidad
  const handleToggleTimeSlot = (time: string) => {
    setErrorMessage(null);
    const existsIndex = selectedSlots.findIndex(
      (s) => s.dateStr === selectedDate && s.timeStr === time
    );

    if (existsIndex >= 0) {
      // Si ya estaba seleccionado, quitarlo
      setSelectedSlots((prev) => prev.filter((_, idx) => idx !== existsIndex));
      return;
    }

    if (bookingMode === 'SINGLE') {
      // En modo simple, reemplaza el horario único (salvo que toque "+ Sumar otro turno")
      setSelectedSlots([
        {
          dateStr: selectedDate,
          timeStr: time,
          label: 'Mi Turno',
        },
      ]);
    } else {
      // En modo Con Amigos o Pack Mensual, agrega al carrito de turnos
      const nextNum = selectedSlots.length + 1;
      const defaultLabel =
        bookingMode === 'FRIENDS'
          ? nextNum === 1
            ? 'Titular'
            : `Amigo ${nextNum - 1}`
          : `Corte #${nextNum} del Mes`;

      setSelectedSlots((prev) => [
        ...prev,
        {
          dateStr: selectedDate,
          timeStr: time,
          label: defaultLabel,
        },
      ]);
    }
  };

  const removeSlotFromCart = (dateStr: string, timeStr: string) => {
    setSelectedSlots((prev) =>
      prev.filter((s) => !(s.dateStr === dateStr && s.timeStr === timeStr))
    );
  };

  const toggleSuggestedProduct = (product: Product) => {
    setAttachedProducts((prev) => {
      const current = prev[product.id] || 0;
      const updated = { ...prev };
      if (current > 0) {
        delete updated[product.id];
      } else {
        updated[product.id] = 1;
      }
      return updated;
    });
  };

  // Manejar creación de reserva y redirección a Mercado Pago
  const handleSubmitBooking = () => {
    if (!selectedService || selectedSlots.length === 0) {
      setErrorMessage('Seleccioná al menos un día y horario para tu turno.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Por favor ingresá tu nombre y teléfono (WhatsApp).');
      return;
    }

    setErrorMessage(null);

    const [primary, ...additional] = selectedSlots;
    const attachedPayload = Object.entries(attachedProducts)
      .filter(([, q]) => q > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    startTransition(async () => {
      const result = await createBookingAction({
        serviceId: selectedService.id,
        dateStr: primary.dateStr,
        timeStr: primary.timeStr,
        additionalSlots: additional,
        attachedProducts: attachedPayload,
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
                        ● Turnos libres hoy (1 o varios turnos)
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

          {/* PASO 2: Selección de Fecha y Horario (Soporta 1 turno, Amigos o Pack Mensual 30 días) */}
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

              {/* Selector de Modalidad: Individual vs. Venir con un Amigo vs. Varios Cortes en el Mes */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] font-bold block">
                  ¿Cuántos turnos querés reservar hoy?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingMode('SINGLE');
                      if (selectedSlots.length > 1) {
                        setSelectedSlots([selectedSlots[0]]);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      bookingMode === 'SINGLE'
                        ? 'border-[#d4af37] bg-[#d4af37]/15 text-zinc-900 dark:text-[#f4efe6]'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-[#d4af37]/40'
                    }`}
                  >
                    <span className="font-bold text-xs block">1 Turno Individual</span>
                    <span className="text-[11px] opacity-80">Solo para mí</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookingMode('FRIENDS')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      bookingMode === 'FRIENDS'
                        ? 'border-[#d4af37] bg-[#d4af37]/15 text-zinc-900 dark:text-[#f4efe6]'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-[#d4af37]/40'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Vengo con un Amigo (2+)</span>
                    </span>
                    <span className="text-[11px] opacity-80">
                      Elegí 2 horarios seguidos
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookingMode('MONTHLY')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      bookingMode === 'MONTHLY'
                        ? 'border-[#d4af37] bg-[#d4af37]/15 text-zinc-900 dark:text-[#f4efe6]'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-[#d4af37]/40'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Agenda Mensual (3 o 4 cortes)</span>
                    </span>
                    <span className="text-[11px] opacity-80">
                      Fijá tus días de todo el mes
                    </span>
                  </button>
                </div>
              </div>

              {/* Selector de Días Horizontal (30 días en zona horaria Catamarca) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    1. Seleccioná el día (Calendario a 30 días):
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    Deslizá para ver todo el mes →
                  </span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                  {availableDates.map((d) => {
                    const isSelected = selectedDate === d.dateStr;
                    const slotsInThisDate = selectedSlots.filter(
                      (s) => s.dateStr === d.dateStr
                    ).length;

                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        disabled={d.isClosed}
                        onClick={() => setSelectedDate(d.dateStr)}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl min-w-[76px] min-h-[82px] border shrink-0 transition-all snap-start ${
                          d.isClosed
                            ? 'border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-100/60 dark:bg-zinc-900/25 text-zinc-400 dark:text-zinc-600 opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'border-[#d4af37] bg-[#d4af37] text-zinc-950 font-bold shadow-lg shadow-[#d4af37]/20 cursor-pointer'
                            : slotsInThisDate > 0
                            ? 'border-[#d4af37] bg-[#d4af37]/15 text-zinc-900 dark:text-[#f4efe6] font-bold cursor-pointer'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-300 hover:border-[#d4af37]/50 cursor-pointer'
                        }`}
                      >
                        {slotsInThisDate > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-mono text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                            {slotsInThisDate}
                          </span>
                        )}
                        <span className="font-mono text-[10px] uppercase tracking-wider">
                          {d.dayName}
                        </span>
                        <span className="font-mono text-xl font-extrabold my-0.5">
                          {d.dayNumber}
                        </span>
                        <span className="font-mono text-[9px] uppercase opacity-80">
                          {d.isClosed ? 'CERRADO' : d.monthName}
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
                    2. {bookingMode === 'SINGLE'
                      ? 'Seleccioná un horario disponible:'
                      : 'Tocá los horarios que quieras sumar a tu reserva:'}
                  </span>
                  <span className="font-mono text-[11px] text-[#b38f2d] dark:text-[#d4af37]">
                    Horario Catamarca ({selectedDate})
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
                      El estudio permanece cerrado o la agenda del día ya se encuentra
                      completa. Probá seleccionando otro día.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map((slot) => {
                      const selectedEntry = selectedSlots.find(
                        (s) => s.dateStr === selectedDate && s.timeStr === slot.time
                      );
                      const isSelected = Boolean(selectedEntry);

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => handleToggleTimeSlot(slot.time)}
                          className={`py-3 px-2 rounded-xl font-mono text-xs font-bold transition-all min-h-[48px] flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[#d4af37] text-zinc-950 shadow-md shadow-[#d4af37]/25 ring-2 ring-[#d4af37] cursor-pointer'
                              : slot.available
                              ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-[#f4efe6] border border-zinc-200 dark:border-zinc-800 hover:border-[#d4af37]/60 cursor-pointer'
                              : 'bg-zinc-100/60 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-600 border border-transparent cursor-not-allowed opacity-45 line-through'
                          }`}
                        >
                          <span>{slot.time} hs</span>
                          {isSelected && (
                            <span className="text-[9px] font-sans font-extrabold uppercase mt-0.5">
                              ✓ {selectedEntry?.label}
                            </span>
                          )}
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

              {/* Resumen de Turnos Seleccionados + Botón para sumar otro turno */}
              {selectedSlots.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold uppercase text-zinc-900 dark:text-[#f4efe6]">
                      Turnos en tu reserva ({selectedSlots.length}):
                    </span>
                    {bookingMode === 'SINGLE' && (
                      <button
                        type="button"
                        onClick={() => setBookingMode('FRIENDS')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#b38f2d] dark:text-[#d4af37] hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Sumar otro turno (Amigo o Pack Mensual)</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedSlots.map((s, idx) => (
                      <div
                        key={`${s.dateStr}_${s.timeStr}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#d4af37]/40 text-xs"
                      >
                        <span className="font-mono font-bold text-[#b38f2d] dark:text-[#d4af37]">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {s.dateStr} • {s.timeStr} hs
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSlotFromCart(s.dateStr, s.timeStr)}
                          className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                          title="Quitar este horario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón Siguiente a Paso 3 */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button
                  type="button"
                  disabled={selectedSlots.length === 0}
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-xs font-bold uppercase tracking-wider bg-[#d4af37] hover:bg-[#e5c158] text-zinc-950 shadow-lg shadow-[#d4af37]/20 disabled:opacity-40 transition-all min-h-[48px] cursor-pointer"
                >
                  <span>
                    Continuar ({selectedSlots.length}{' '}
                    {selectedSlots.length === 1 ? 'Turno' : 'Turnos'})
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Sugerencia Inteligente de Productos + Datos del Cliente y Cobro Mercado Pago */}
          {step === 3 && selectedService && selectedSlots.length > 0 && (
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
                  <span>Cambiar horarios</span>
                </button>
              </div>

              {/* UPSELLING INTELIGENTE DE PRODUCTOS SEGÚN EL SERVICIO ELEGIDO */}
              {suggestedProductsForService.length > 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-[#d4af37]/10 border border-[#d4af37]/35 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest font-bold text-[#b38f2d] dark:text-[#d4af37]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>RECOMENDADO PARA TU {selectedService.name.toUpperCase()}</span>
                      </span>
                      <h3 className="text-sm font-extrabold text-zinc-900 dark:text-[#f4efe6] mt-0.5">
                        ¿Querés sumar un producto profesional para retirar el día de tu turno?
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {suggestedProductsForService.map((prod) => {
                      const isAdded = (attachedProducts[prod.id] || 0) > 0;
                      return (
                        <div
                          key={prod.id}
                          onClick={() => toggleSuggestedProduct(prod)}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isAdded
                              ? 'border-[#d4af37] bg-[#d4af37]/20 shadow-sm'
                              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-[#d4af37]/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={prod.imageUrl || '/images/interior-sillas.webp'}
                              alt={prod.name}
                              className="w-11 h-11 rounded-xl object-cover border border-[#d4af37]/30 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-900 dark:text-[#f4efe6] truncate">
                                {prod.name}
                              </p>
                              <span className="font-mono text-xs font-extrabold text-[#b38f2d] dark:text-[#d4af37]">
                                +${Number(prod.price).toLocaleString('es-AR')}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold shrink-0 ${
                              isAdded
                                ? 'bg-[#d4af37] text-zinc-950'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {isAdded ? '✓ Sumado' : '+ Sumar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    placeholder="Ej: Vengo con mi amigo Matías / Degradado medio..."
                    className="w-full p-3.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] placeholder:text-zinc-400 focus:ring-2 focus:ring-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Aviso de Bloqueo de 10 min */}
              <div className="p-4 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-xs flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#b38f2d] dark:text-[#d4af37] shrink-0 mt-0.5" />
                <span className="leading-relaxed text-zinc-700 dark:text-zinc-300">
                  Al presionar <strong>&ldquo;Pagar y Confirmar Turno&rdquo;</strong>, el sistema
                  reserva {selectedSlots.length > 1 ? 'estos horarios' : 'este horario'} para vos durante{' '}
                  <strong>10 minutos</strong> mientras finalizás el pago en Mercado Pago.
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
                    <span>Bloqueando horarios y abriendo Mercado Pago...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>
                      Pagar y Confirmar ({selectedSlots.length}{' '}
                      {selectedSlots.length === 1 ? 'Turno' : 'Turnos'} — $
                      {totals.grandTotal.toLocaleString('es-AR')})
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
                <span className="text-zinc-500 uppercase">Cantidad de Turnos:</span>
                <span className="text-[#d4af37] font-bold">
                  {selectedSlots.length > 0 ? `${selectedSlots.length}x` : '1x'} (
                  {selectedService ? `${selectedService.durationMinutes} min c/u` : '—'})
                </span>
              </div>

              <div className="border-b border-dashed border-zinc-800 pb-3 space-y-1.5">
                <span className="text-zinc-500 uppercase block">
                  {selectedSlots.length > 1 ? 'Fechas y Horarios:' : 'Fecha y Horario:'}
                </span>
                {selectedSlots.length === 0 ? (
                  <div className="flex justify-between">
                    <span className="text-white">{selectedDate || '—'}</span>
                    <span className="text-[#d4af37]">Elegí una hora</span>
                  </div>
                ) : (
                  selectedSlots.map((s, idx) => (
                    <div
                      key={`${s.dateStr}_${s.timeStr}`}
                      className="flex justify-between items-center text-[11px]"
                    >
                      <span className="text-white font-semibold">
                        #{idx + 1} {s.dateStr}
                      </span>
                      <span className="text-[#d4af37] font-bold">{s.timeStr} hs</span>
                    </div>
                  ))
                )}
              </div>

              {totals.addedProductsList.length > 0 && (
                <div className="border-b border-dashed border-zinc-800 pb-3 space-y-1">
                  <span className="text-zinc-500 uppercase flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3 text-[#d4af37]" />
                    <span>Productos Sumados:</span>
                  </span>
                  {totals.addedProductsList.map(({ product, quantity }) => (
                    <div key={product.id} className="flex justify-between text-[11px]">
                      <span className="text-emerald-400">
                        + {quantity}x {product.name}
                      </span>
                      <span className="text-white font-bold">
                        ${(Number(product.price) * quantity).toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

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
                  ? `$${totals.grandTotal.toLocaleString('es-AR')}`
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
