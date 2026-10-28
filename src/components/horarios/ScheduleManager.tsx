'use client';

import { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Loader2,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { NewBlockModal } from './NewBlockModal';
import {
  updateWeeklyHoursAction,
  deleteScheduleBlockAction,
} from '@/app/actions/scheduleActions';
import {
  updateReschedulePolicyAction,
  type ReschedulePolicy,
} from '@/app/actions/clientRescheduleActions';
import type { BusinessHour, ScheduleBlock } from '@/db/schema';

interface ScheduleManagerProps {
  initialHours: BusinessHour[];
  initialBlocks: ScheduleBlock[];
  initialReschedulePolicy?: ReschedulePolicy;
  isAdmin: boolean;
}

const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export function ScheduleManager({
  initialHours,
  initialBlocks,
  initialReschedulePolicy = { enabled: true, minHoursBefore: 2 },
  isAdmin,
}: ScheduleManagerProps) {
  const [hoursList, setHoursList] = useState(initialHours);
  const [blocksList, setBlocksList] = useState(initialBlocks);
  const [activeTab, setActiveTab] = useState<'weekly' | 'blocks'>('weekly');
  const [isNewBlockOpen, setIsNewBlockOpen] = useState(false);

  // Estado de Política de Reprogramación Autogestionada
  const [policyEnabled, setPolicyEnabled] = useState(
    initialReschedulePolicy.enabled
  );
  const [minHoursBefore, setMinHoursBefore] = useState(
    initialReschedulePolicy.minHoursBefore
  );
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savedPolicySuccess, setSavedPolicySuccess] = useState(false);

  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [savedSuccessDay, setSavedSuccessDay] = useState<number | null>(null);

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    setSavedPolicySuccess(false);
    const res = await updateReschedulePolicyAction({
      enabled: policyEnabled,
      minHoursBefore,
    });
    setSavingPolicy(false);
    if (res.success) {
      setSavedPolicySuccess(true);
      setTimeout(() => setSavedPolicySuccess(false), 2500);
    }
  };

  const updateDayField = <K extends keyof BusinessHour>(
    dayOfWeek: number,
    field: K,
    val: BusinessHour[K]
  ) => {
    setHoursList((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: val } : h))
    );
  };

  const handleSaveDay = async (dayOfWeek: number) => {
    const dayData = hoursList.find((h) => h.dayOfWeek === dayOfWeek);
    if (!dayData) return;

    setSavingDay(dayOfWeek);
    setSavedSuccessDay(null);

    const res = await updateWeeklyHoursAction({
      dayOfWeek,
      isOpen: dayData.isOpen,
      openTime: dayData.openTime,
      closeTime: dayData.closeTime,
      hasBreak: dayData.hasBreak,
      openTime2: dayData.openTime2 || undefined,
      closeTime2: dayData.closeTime2 || undefined,
    });

    setSavingDay(null);
    if (res.success) {
      setSavedSuccessDay(dayOfWeek);
      setTimeout(() => setSavedSuccessDay(null), 2500);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    setBlocksList((prev) => prev.filter((b) => b.id !== id));
    await deleteScheduleBlockAction(id);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Título */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37] block mb-1">
            CONFIGURACIÓN DE APERTURA & REGLAS
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
            Horarios Laborales & Bloqueos
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Definí los turnos de mañana y tarde, la anticipación para reprogramar y bloqueos de feriados.
          </p>
        </div>

        {activeTab === 'blocks' && isAdmin && (
          <button
            type="button"
            onClick={() => setIsNewBlockOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-lg shadow-[#d4af37]/20 transition-all min-h-[46px] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Bloqueo</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          REGLA DE REPROGRAMACIÓN AUTOGESTIONADA POR EL CLIENTE (/mi-turno)
      ====================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#100f13] border border-[#d4af37]/35 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#b38f2d] dark:text-[#d4af37] shrink-0 mt-0.5">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37]">
                AUTOGESTIÓN DE CLIENTES (/MI-TURNO)
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                  policyEnabled
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                }`}
              >
                {policyEnabled ? 'Activa' : 'Pausada'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-zinc-950 dark:text-[#f4efe6] mt-0.5">
              Tiempo mínimo de anticipación para reprogramar un turno pagado
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-2xl">
              El cliente recibe este aviso al confirmar su pago y puede cambiar su horario por sí mismo hasta{' '}
              <strong className="text-zinc-900 dark:text-[#d4af37]">
                {minHoursBefore} {minHoursBefore === 1 ? 'hora' : 'horas'} antes
              </strong>{' '}
              del turno sin que tengas que contestar WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Switch Activar/Desactivar */}
          <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              disabled={!isAdmin}
              checked={policyEnabled}
              onChange={(e) => setPolicyEnabled(e.target.checked)}
              className="w-4 h-4 rounded accent-[#d4af37]"
            />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
              Permitir reprogramar
            </span>
          </label>

          {/* Selector de Horas de Anticipación */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 min-h-[44px]">
            <span className="font-mono text-[11px] uppercase text-zinc-400">
              Hasta:
            </span>
            <select
              disabled={!isAdmin || !policyEnabled}
              value={minHoursBefore}
              onChange={(e) => setMinHoursBefore(Number(e.target.value))}
              className="font-mono text-xs font-extrabold bg-transparent text-zinc-950 dark:text-[#d4af37] focus:outline-none cursor-pointer"
            >
              <option value={1} className="bg-white dark:bg-zinc-900">
                1 hora antes
              </option>
              <option value={2} className="bg-white dark:bg-zinc-900">
                2 horas antes
              </option>
              <option value={3} className="bg-white dark:bg-zinc-900">
                3 horas antes
              </option>
              <option value={4} className="bg-white dark:bg-zinc-900">
                4 horas antes
              </option>
              <option value={6} className="bg-white dark:bg-zinc-900">
                6 horas antes
              </option>
              <option value={12} className="bg-white dark:bg-zinc-900">
                12 horas antes
              </option>
              <option value={24} className="bg-white dark:bg-zinc-900">
                24 horas antes
              </option>
            </select>
          </div>

          {isAdmin && (
            <button
              type="button"
              disabled={savingPolicy}
              onClick={handleSavePolicy}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                savedPolicySuccess
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-md shadow-[#d4af37]/20'
              }`}
            >
              {savingPolicy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedPolicySuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Regla Guardada</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Regla</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 p-1.5 shadow-xs w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[42px] cursor-pointer ${
            activeTab === 'weekly'
              ? 'bg-zinc-950 dark:bg-[#d4af37] text-white dark:text-zinc-950 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#f4efe6]'
          }`}
        >
          Franjas Semanales (Lun a Dom)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('blocks')}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[42px] flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'blocks'
              ? 'bg-zinc-950 dark:bg-[#d4af37] text-white dark:text-zinc-950 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#f4efe6]'
          }`}
        >
          <span>Feriados & Vacaciones</span>
          <span className="font-mono px-2 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-[#d4af37]">
            {blocksList.length}
          </span>
        </button>
      </div>

      {/* SECCIÓN 1: Horarios Semanales */}
      {activeTab === 'weekly' && (
        <div className="grid grid-cols-1 gap-3.5">
          {hoursList.map((h) => {
            const isSaving = savingDay === h.dayOfWeek;
            const isSaved = savedSuccessDay === h.dayOfWeek;
            const dayTitle = DAY_NAMES[h.dayOfWeek];

            return (
              <div
                key={h.dayOfWeek}
                className={`p-5 rounded-3xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  h.isOpen
                    ? 'bg-white dark:bg-[#100f13] border-zinc-200/90 dark:border-zinc-800/90'
                    : 'bg-zinc-100/50 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-75'
                }`}
              >
                {/* Nombre del Día y Switch Abierto/Cerrado */}
                <div className="flex items-center justify-between lg:justify-start gap-4 min-w-[200px]">
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-950 dark:text-[#f4efe6]">
                      {dayTitle}
                    </h3>
                    <span
                      className={`font-mono text-[11px] font-semibold mt-0.5 block ${
                        h.isOpen
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {h.isOpen ? '● Abierto al público' : '○ Cerrado por descanso'}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={h.isOpen}
                      onChange={(e) =>
                        updateDayField(h.dayOfWeek, 'isOpen', e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-700 peer-checked:bg-[#d4af37]" />
                  </label>
                </div>

                {/* Configuración de Franjas Horarias */}
                {h.isOpen && (
                  <div className="flex-1 flex flex-wrap items-center gap-4">
                    {/* Franja Mañana */}
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/80 px-3 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      <span className="font-mono text-[11px] uppercase text-zinc-400">
                        Mañana:
                      </span>
                      <input
                        type="time"
                        value={h.openTime}
                        onChange={(e) =>
                          updateDayField(h.dayOfWeek, 'openTime', e.target.value)
                        }
                        className="font-mono text-xs font-bold bg-transparent text-zinc-900 dark:text-[#f4efe6] focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">a</span>
                      <input
                        type="time"
                        value={h.closeTime}
                        onChange={(e) =>
                          updateDayField(h.dayOfWeek, 'closeTime', e.target.value)
                        }
                        className="font-mono text-xs font-bold bg-transparent text-zinc-900 dark:text-[#f4efe6] focus:outline-none"
                      />
                    </div>

                    {/* Checkbox Doble Turno */}
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.hasBreak}
                        onChange={(e) =>
                          updateDayField(h.dayOfWeek, 'hasBreak', e.target.checked)
                        }
                        className="w-4 h-4 rounded accent-[#d4af37]"
                      />
                      <span className="text-zinc-600 dark:text-zinc-300">
                        Doble Turno (Tarde)
                      </span>
                    </label>

                    {/* Franja Tarde */}
                    {h.hasBreak && (
                      <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/80 px-3 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <span className="font-mono text-[11px] uppercase text-[#d4af37]">
                          Tarde:
                        </span>
                        <input
                          type="time"
                          value={h.openTime2 || '17:30'}
                          onChange={(e) =>
                            updateDayField(h.dayOfWeek, 'openTime2', e.target.value)
                          }
                          className="font-mono text-xs font-bold bg-transparent text-zinc-900 dark:text-[#f4efe6] focus:outline-none"
                        />
                        <span className="text-xs text-zinc-400">a</span>
                        <input
                          type="time"
                          value={h.closeTime2 || '22:00'}
                          onChange={(e) =>
                            updateDayField(h.dayOfWeek, 'closeTime2', e.target.value)
                          }
                          className="font-mono text-xs font-bold bg-transparent text-zinc-900 dark:text-[#f4efe6] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Botón Guardar */}
                {isAdmin && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveDay(h.dayOfWeek)}
                      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[42px] cursor-pointer ${
                        isSaved
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-[#d4af37] hover:text-zinc-950 border border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isSaved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Guardado</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Guardar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SECCIÓN 2: Bloqueos de Agenda */}
      {activeTab === 'blocks' && (
        <div className="space-y-4">
          {blocksList.length === 0 ? (
            <div className="p-14 text-center rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 space-y-2">
              <Calendar className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                No hay bloqueos activos de agenda
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Podés crear un bloqueo para feriados, vacaciones o días no laborables.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {blocksList.map((b) => {
                const s = new Date(b.startDate).toLocaleDateString('es-AR');
                const e = new Date(b.endDate).toLocaleDateString('es-AR');

                return (
                  <div
                    key={b.id}
                    className="p-5 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30 mb-2">
                        <ShieldAlert className="w-3 h-3" />
                        <span>{b.isAllDay ? 'Día Completo' : 'Franja Horaria'}</span>
                      </div>
                      <h4 className="text-base font-extrabold text-zinc-950 dark:text-[#f4efe6]">
                        {b.title}
                      </h4>
                      <p className="font-mono text-xs text-[#b38f2d] dark:text-[#d4af37] font-bold mt-1">
                        {s} al {e}
                      </p>
                      {b.reason && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                          {b.reason}
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(b.id)}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl min-h-[42px] min-w-[42px] flex items-center justify-center transition-colors cursor-pointer"
                        title="Eliminar bloqueo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Nuevo Bloqueo */}
      <NewBlockModal
        isOpen={isNewBlockOpen}
        onClose={() => setIsNewBlockOpen(false)}
      />
    </div>
  );
}
