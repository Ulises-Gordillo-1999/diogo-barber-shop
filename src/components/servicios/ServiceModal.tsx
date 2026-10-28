'use client';

import { useState, useEffect, useTransition } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Scissors, Clock, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { createServiceAction, updateServiceAction } from '@/app/actions/servicesActions';
import type { Service } from '@/db/schema';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: Service | null;
  onSaved?: () => void;
}

export function ServiceModal({
  isOpen,
  onClose,
  service,
  onSaved,
}: ServiceModalProps) {
  const isEditing = !!service;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [price, setPrice] = useState('10000');
  const [active, setActive] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description || '');
      setDurationMinutes(String(service.durationMinutes));
      setPrice(String(Number(service.price)));
      setActive(service.active);
    } else {
      setName('');
      setDescription('');
      setDurationMinutes('30');
      setPrice('10000');
      setActive(true);
    }
    setError(null);
  }, [service, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = parseInt(durationMinutes, 10);
    const numPrice = parseFloat(price);

    if (!name.trim()) {
      setError('Por favor ingresá el nombre del servicio.');
      return;
    }

    if (isNaN(duration) || duration <= 0) {
      setError('La duración debe ser un número mayor a 0 minutos.');
      return;
    }

    if (isNaN(numPrice) || numPrice <= 0) {
      setError('El precio debe ser mayor a $0.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = isEditing && service
        ? await updateServiceAction(service.id, {
            name,
            description,
            durationMinutes: duration,
            price: numPrice,
            active,
          })
        : await createServiceAction({
            name,
            description,
            durationMinutes: duration,
            price: numPrice,
            active,
          });

      if (res.success) {
        if (onSaved) onSaved();
        onClose();
      } else {
        setError(res.error || 'Ocurrió un error al guardar el servicio.');
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Servicio' : 'Nuevo Servicio de Barbería'}
      description="Configurá el nombre, duración estimada y precio visible en la reserva online."
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
            htmlFor="srv-name"
            className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
          >
            Nombre del Servicio <span className="text-rose-500">*</span>
          </label>
          <input
            id="srv-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Corte Degradé + Barba"
            className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="srv-dur"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Duración (Minutos) <span className="text-rose-500">*</span>
            </label>
            <input
              id="srv-dur"
              type="number"
              step="5"
              min="10"
              required
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="30"
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="srv-price"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Precio ($ ARS) <span className="text-rose-500">*</span>
            </label>
            <input
              id="srv-price"
              type="number"
              step="100"
              min="100"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="10000"
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="srv-desc"
            className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
          >
            Descripción Breve (opcional)
          </label>
          <textarea
            id="srv-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Incluye terminación a navaja y toalla caliente..."
            className="w-full p-2.5 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700"
          />
          <span className="font-medium text-slate-700 dark:text-zinc-300">
            Servicio Activo (visible para reservas online)
          </span>
        </label>

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
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Servicio'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
