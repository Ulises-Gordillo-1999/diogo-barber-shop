'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { createScheduleBlockAction } from '@/app/actions/scheduleActions';

interface NewBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function NewBlockModal({
  isOpen,
  onClose,
  onCreated,
}: NewBlockModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDateStr, setStartDateStr] = useState(todayStr);
  const [endDateStr, setEndDateStr] = useState(todayStr);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDateStr || !endDateStr) {
      setError('Por favor completá los campos obligatorios.');
      return;
    }

    setError(null);
    startTransition(async () => {
      // Si es día completo, ajustar las horas para abarcar de 00:00 a 23:59
      const start = isAllDay ? `${startDateStr}T00:00:00` : startDateStr;
      const end = isAllDay ? `${endDateStr}T23:59:59` : endDateStr;

      const res = await createScheduleBlockAction({
        title,
        reason,
        startDateStr: start,
        endDateStr: end,
        isAllDay,
      });

      if (res.success) {
        if (onCreated) onCreated();
        onClose();
        setTitle('');
        setReason('');
      } else {
        setError(res.error || 'No se pudo crear el bloqueo.');
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Bloqueo de Agenda"
      description="Bloqueá fechas completas o franjas horarias por feriados, vacaciones o imprevistos."
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label
            htmlFor="blk-title"
            className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
          >
            Título o Motivo <span className="text-rose-500">*</span>
          </label>
          <input
            id="blk-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Feriado Nacional / Vacaciones Diogo"
            className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700"
          />
          <span className="font-medium text-slate-700 dark:text-zinc-300">
            Bloquear día completo (00:00 a 23:59 hs)
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="blk-start"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Fecha Inicio <span className="text-rose-500">*</span>
            </label>
            <input
              id="blk-start"
              type={isAllDay ? 'date' : 'datetime-local'}
              required
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="blk-end"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Fecha Fin <span className="text-rose-500">*</span>
            </label>
            <input
              id="blk-end"
              type={isAllDay ? 'date' : 'datetime-local'}
              required
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="blk-reason"
            className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
          >
            Observación / Nota interna (opcional)
          </label>
          <textarea
            id="blk-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: El local permanecerá cerrado por obras de pintura..."
            className="w-full p-2.5 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
          />
        </div>

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
                <span>Guardando...</span>
              </>
            ) : (
              <span>Confirmar Bloqueo</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
