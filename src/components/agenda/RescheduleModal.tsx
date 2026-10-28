'use client';

import { useState, useEffect, useTransition } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  Calendar,
  Clock,
  Scissors,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { fetchAvailableSlotsAction } from '@/app/actions/bookingActions';
import { rescheduleAppointmentAction } from '@/app/actions/agendaActions';
import { WhatsAppAlertButton } from './WhatsAppAlertButton';
import type { TimeSlot } from '@/utils/availability';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    serviceId: string;
    serviceName: string;
    customerName: string;
    customerPhone: string;
    startTime: Date | string;
  } | null;
  onRescheduled?: (newDateStr: string, newTimeStr: string) => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  onRescheduled,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Fechas próximas 14 días
  const nextDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(d);
    const dayNumber = d.getDate();
    return {
      dateStr,
      label: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNumber}`,
    };
  });

  // Inicializar fecha al abrir
  useEffect(() => {
    if (isOpen && nextDates.length > 0) {
      setSelectedDate(nextDates[0].dateStr);
      setSelectedTime('');
      setIsSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  // Cargar slots cuando cambie la fecha
  useEffect(() => {
    if (isOpen && appointment && selectedDate) {
      setLoadingSlots(true);
      setSelectedTime('');
      fetchAvailableSlotsAction(appointment.serviceId, selectedDate)
        .then((s) => setSlots(s))
        .catch(() => setSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [isOpen, appointment, selectedDate]);

  if (!appointment) return null;

  const handleConfirmReschedule = () => {
    if (!selectedDate || !selectedTime) {
      setError('Por favor seleccioná una fecha y hora.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await rescheduleAppointmentAction({
        appointmentId: appointment.id,
        newDateStr: selectedDate,
        newTimeStr: selectedTime,
      });

      if (res.success) {
        setIsSuccess(true);
        if (onRescheduled) {
          onRescheduled(selectedDate, selectedTime);
        }
      } else {
        setError(res.error || 'No se pudo reprogramar.');
      }
    });
  };

  const currentStartDate = new Date(appointment.startTime);
  const formattedCurrent = `${currentStartDate.toLocaleDateString('es-AR')} a las ${new Intl.DateTimeFormat(
    'es-AR',
    { hour: '2-digit', minute: '2-digit' }
  ).format(currentStartDate)} hs`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reprogramar Turno"
      description={`Cliente: ${appointment.customerName} • ${appointment.serviceName}`}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4">
        {/* Horario actual */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs flex items-center justify-between">
          <span className="text-slate-500 dark:text-zinc-400">Horario actual:</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200">
            {formattedCurrent}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                ¡Turno Reprogramado!
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                Nuevo horario: {selectedDate} a las {selectedTime} hs.
              </p>
            </div>

            {/* Botón WhatsApp de aviso */}
            <div className="pt-2 flex flex-col gap-2">
              <WhatsAppAlertButton
                customerPhone={appointment.customerPhone}
                customerName={appointment.customerName}
                serviceName={appointment.serviceName}
                startTime={`${selectedDate}T${selectedTime}:00`}
                variant="reschedule"
                className="w-full text-sm py-2.5"
              />
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[44px]"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Selector de nueva fecha */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Elegí la nueva fecha:
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {nextDates.map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(d.dateStr)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border shrink-0 transition-all min-h-[44px] ${
                      selectedDate === d.dateStr
                        ? 'bg-amber-500 border-amber-500 text-zinc-950 font-bold shadow-xs'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-amber-500/40'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grilla de horarios disponibles */}
            <div className="space-y-2 text-left">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Horarios disponibles ({selectedDate}):
              </label>

              {loadingSlots ? (
                <div className="p-8 text-center flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Calculando huecos libres...</span>
                </div>
              ) : slots.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-zinc-400 py-4 text-center">
                  No hay horarios disponibles para esta fecha.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {slots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg transition-all min-h-[44px] ${
                          isSelected
                            ? 'bg-amber-500 text-zinc-950 shadow-xs ring-2 ring-amber-400'
                            : slot.available
                            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700 hover:border-amber-500'
                            : 'opacity-30 bg-slate-100 dark:bg-zinc-900 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {slot.time} hs
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botón de confirmar */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedTime || isPending}
                onClick={handleConfirmReschedule}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-40 shadow-xs min-h-[44px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Reprogramar Turno</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
