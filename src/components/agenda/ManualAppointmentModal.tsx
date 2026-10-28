'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  Scissors,
  User,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { createManualAppointmentAction } from '@/app/actions/agendaActions';
import type { Service } from '@/db/schema';

interface ManualAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  onCreated?: () => void;
}

export function ManualAppointmentModal({
  isOpen,
  onClose,
  services,
  onCreated,
}: ManualAppointmentModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dateStr, setDateStr] = useState(todayStr);
  const [timeStr, setTimeStr] = useState('11:00');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'MERCADOPAGO'>('CASH');
  const [isPaid, setIsPaid] = useState(true);
  const [customerNotes, setCustomerNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedService = services.find((s) => s.id === serviceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !customerName.trim() || !customerPhone.trim() || !dateStr || !timeStr) {
      setError('Por favor completá todos los campos obligatorios.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createManualAppointmentAction({
        serviceId,
        customerName,
        customerPhone,
        dateStr,
        timeStr,
        paymentMethod,
        isPaid,
        customerNotes,
      });

      if (res.success) {
        if (onCreated) onCreated();
        onClose();
      } else {
        setError(res.error || 'No se pudo crear el turno.');
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cargar Turno Presencial"
      description="Agendá un turno para un cliente en el local o coordinado por teléfono."
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selección de Servicio */}
        <div className="space-y-1.5">
          <label
            htmlFor="service-select"
            className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
          >
            Servicio a Realizar <span className="text-rose-500">*</span>
          </label>
          <select
            id="service-select"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (${Number(s.price).toLocaleString('es-AR')} - {s.durationMinutes} min)
              </option>
            ))}
          </select>
        </div>

        {/* Datos del Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="cust-name"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Nombre y Apellido <span className="text-rose-500">*</span>
            </label>
            <input
              id="cust-name"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej: Marcos Pérez"
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="cust-phone"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Teléfono WhatsApp <span className="text-rose-500">*</span>
            </label>
            <input
              id="cust-phone"
              type="tel"
              inputMode="numeric"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Ej: 11 9876 5432"
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Fecha y Hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="date-input"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Fecha <span className="text-rose-500">*</span>
            </label>
            <input
              id="date-input"
              type="date"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="time-input"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Hora <span className="text-rose-500">*</span>
            </label>
            <input
              id="time-input"
              type="time"
              required
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Medio de Cobro */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Método de Pago:
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Monto: ${selectedService ? Number(selectedService.price).toLocaleString('es-AR') : '0'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['CASH', 'TRANSFER', 'MERCADOPAGO'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all min-h-[44px] ${
                  paymentMethod === method
                    ? 'bg-amber-500 border-amber-500 text-zinc-950 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                {method === 'CASH' ? 'Efectivo' : method === 'TRANSFER' ? 'Transf.' : 'Mercado Pago'}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2.5 pt-1 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700"
            />
            <span className="font-medium text-slate-700 dark:text-zinc-300">
              Cobrado ahora en el local (Impactar en Caja inmediatamente)
            </span>
          </label>
        </div>

        {/* Botones de acción */}
        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-50 shadow-xs min-h-[44px]"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Agendando...</span>
              </>
            ) : (
              <span>Confirmar y Guardar Turno</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
