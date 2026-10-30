'use client';

import { useState, useTransition } from 'react';
import {
  Plus,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ServiceModal } from './ServiceModal';
import {
  toggleServiceStatusAction,
  deleteServiceAction,
} from '@/app/actions/servicesActions';
import type { Service, Product } from '@/db/schema';

interface ServicesManagerProps {
  initialServices: Service[];
  availableProducts?: Product[];
  isAdmin: boolean;
}

export function ServicesManager({
  initialServices,
  availableProducts = [],
  isAdmin,
}: ServicesManagerProps) {
  const [servicesList, setServicesList] = useState(initialServices);
  const [modalService, setModalService] = useState<Service | null | undefined>(
    undefined
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleToggleActive = (id: string, current: boolean) => {
    setErrorBanner(null);
    startTransition(async () => {
      setServicesList((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: !current } : s))
      );
      await toggleServiceStatusAction(id, current);
    });
  };

  const handleDelete = (id: string) => {
    setErrorBanner(null);
    startTransition(async () => {
      const res = await deleteServiceAction(id);
      if (res.success) {
        setServicesList((prev) => prev.filter((s) => s.id !== id));
      } else {
        setErrorBanner(res.error || 'No se pudo eliminar el servicio.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Barra de Título y Acción Nuevo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37] block mb-1">
            CATÁLOGO OFICIAL & UPSELLING
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
            Carta de Servicios & Tarifas
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configurá los cortes, precios, duración y qué productos del inventario sugerirle al cliente cuando reserva cada servicio.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setModalService(null)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-lg shadow-[#d4af37]/20 transition-all min-h-[46px] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Servicio</span>
          </button>
        )}
      </div>

      {errorBanner && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Grilla de Tarjetas de Servicios estilo Boutique */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servicesList.map((s, idx) => {
          let suggestedIds: string[] = [];
          try {
            suggestedIds = JSON.parse(s.suggestedProductIds || '[]');
          } catch {
            suggestedIds = [];
          }
          const suggestedProducts = availableProducts.filter((p) =>
            suggestedIds.includes(p.id)
          );

          return (
            <div
              key={s.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between gap-5 ${
                s.active
                  ? 'bg-white dark:bg-[#100f13] border-zinc-200/90 dark:border-zinc-800/90 hover:border-[#d4af37]/50'
                  : 'bg-zinc-100/60 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/50 opacity-65'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30">
                      N° 0{idx + 1}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
                      {s.durationMinutes} min
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      s.active
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                        : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                    }`}
                  >
                    {s.active ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {s.active ? 'Visible Online' : 'Pausado'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-xl font-extrabold text-zinc-950 dark:text-[#f4efe6]">
                    {s.name}
                  </h3>
                  <span className="font-mono text-2xl font-extrabold text-[#b38f2d] dark:text-[#d4af37] shrink-0">
                    ${Number(s.price).toLocaleString('es-AR')}
                  </span>
                </div>

                {s.description && (
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {s.description}
                  </p>
                )}

                {/* Productos Sugeridos vinculados al servicio */}
                <div className="p-3 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/25 space-y-1.5">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-bold text-[#b38f2d] dark:text-[#d4af37]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Productos sugeridos al cliente al reservar:</span>
                  </span>
                  {suggestedProducts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedProducts.map((prod) => (
                        <span
                          key={prod.id}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-[#d4af37]/30"
                        >
                          {prod.name} (${Number(prod.price).toLocaleString('es-AR')})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">
                      Sugerencia automática según categoría (tocá Editar para personalizar).
                    </p>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(s.id, s.active)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors min-h-[40px] cursor-pointer ${
                      s.active
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {s.active ? 'Ocultar temporalmente' : 'Activar en la web'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModalService(s)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#d4af37] hover:text-zinc-950 transition-all min-h-[40px] cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer"
                      title="Eliminar servicio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de Crear / Editar Servicio */}
      <ServiceModal
        isOpen={modalService !== undefined}
        onClose={() => setModalService(undefined)}
        service={modalService}
        availableProducts={availableProducts}
      />
    </div>
  );
}
