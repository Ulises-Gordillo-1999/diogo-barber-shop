'use client';

import { useState, useEffect, useOptimistic, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  Scissors,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  TrendingUp,
  UserCheck,
  Sparkles,
  Phone,
} from 'lucide-react';
import { updateAppointmentStatusAction } from '@/app/actions/agendaActions';
import { RescheduleModal } from './RescheduleModal';
import { ManualAppointmentModal } from './ManualAppointmentModal';
import { WhatsAppAlertButton } from './WhatsAppAlertButton';
import type { Service } from '@/db/schema';

export interface AppointmentItem {
  id: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  startTime: Date | string;
  endTime: Date | string;
  status:
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'RESCHEDULED'
    | 'CANCELLED'
    | 'NO_SHOW';
  price: string;
  paymentMethod: string;
  paymentStatus: string;
}

interface AgendaViewProps {
  initialAppointments: AppointmentItem[];
  services: Service[];
  initialDateStr: string;
}

function getStatusMeta(status: AppointmentItem['status']) {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmado',
        dot: 'bg-sky-400',
        badge:
          'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
      };
    case 'COMPLETED':
      return {
        label: 'Atendido',
        dot: 'bg-emerald-400',
        badge:
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
      };
    case 'PENDING_PAYMENT':
      return {
        label: 'Pago en curso',
        dot: 'bg-[#d4af37] animate-pulse',
        badge:
          'bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border-[#d4af37]/30',
      };
    case 'RESCHEDULED':
      return {
        label: 'Reprogramado',
        dot: 'bg-amber-400',
        badge:
          'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
      };
    case 'CANCELLED':
    case 'NO_SHOW':
    default:
      return {
        label: 'Cancelado',
        dot: 'bg-rose-400',
        badge:
          'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
      };
  }
}

function getPaymentMethodBadge(method: string) {
  switch (method) {
    case 'MERCADOPAGO':
      return 'Mercado Pago';
    case 'CASH':
      return 'Efectivo';
    case 'TRANSFER':
      return 'Transferencia';
    default:
      return method;
  }
}

export function AgendaView({
  initialAppointments,
  services,
  initialDateStr,
}: AgendaViewProps) {
  const [selectedDate, setSelectedDate] = useState(initialDateStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  // Modales
  const [rescheduleTarget, setRescheduleTarget] =
    useState<AppointmentItem | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sincronización inteligente: cada 15s si la pestaña está activa, y al reenfocar
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        startTransition(() => {
          router.refresh();
        });
      }
    }, 15000);

    const handleFocus = () => {
      startTransition(() => {
        router.refresh();
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  const handleManualSync = () => {
    setIsSyncing(true);
    startTransition(() => {
      router.refresh();
      setTimeout(() => setIsSyncing(false), 500);
    });
  };

  // Optimistic UI para actualizar el estado del turno inmediatamente sin esperar a la BD
  const [optimisticAppointments, setOptimisticAppointments] = useOptimistic(
    initialAppointments,
    (state, update: { id: string; newStatus: AppointmentItem['status'] }) => {
      return state.map((item) =>
        item.id === update.id ? { ...item, status: update.newStatus } : item
      );
    }
  );

  // Cambiar día con botones anterior / siguiente
  const changeDateByDays = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const setDateToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Cinta rápida de 7 días centrada desde ayer hasta +5 días
  const quickDays = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() + (idx - 1));
      const dateStr = d.toISOString().split('T')[0];
      const dayShort = new Intl.DateTimeFormat('es-AR', {
        weekday: 'short',
      }).format(d);
      const dayNum = d.getDate();

      // Contar turnos activos en ese día
      const count = optimisticAppointments.filter((a) => {
        const aDate = new Date(a.startTime).toISOString().split('T')[0];
        return aDate === dateStr && a.status !== 'CANCELLED';
      }).length;

      return {
        dateStr,
        dayShort: dayShort.charAt(0).toUpperCase() + dayShort.slice(1),
        dayNum,
        isToday: dateStr === todayStr,
        count,
      };
    });
  }, [optimisticAppointments]);

  // Filtrado reactivo en memoria
  const filteredAppointments = useMemo(() => {
    return optimisticAppointments.filter((app) => {
      const appDateStr = new Date(app.startTime).toISOString().split('T')[0];
      if (appDateStr !== selectedDate) return false;

      if (statusFilter !== 'TODOS' && app.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.customerName.toLowerCase().includes(q);
        const matchPhone = app.customerPhone.includes(q);
        const matchService = app.serviceName.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchService) return false;
      }

      return true;
    });
  }, [optimisticAppointments, selectedDate, statusFilter, searchQuery]);

  // Métricas del día seleccionado
  const dayStats = useMemo(() => {
    const dayApps = optimisticAppointments.filter((app) => {
      const d = new Date(app.startTime).toISOString().split('T')[0];
      return d === selectedDate && app.status !== 'CANCELLED';
    });

    const totalRevenue = dayApps.reduce((acc, app) => acc + Number(app.price), 0);
    const completedCount = dayApps.filter((a) => a.status === 'COMPLETED').length;
    const confirmedCount = dayApps.filter(
      (a) => a.status === 'CONFIRMED' || a.status === 'RESCHEDULED'
    ).length;

    return {
      total: dayApps.length,
      completed: completedCount,
      confirmed: confirmedCount,
      revenue: totalRevenue,
    };
  }, [optimisticAppointments, selectedDate]);

  // Manejar cambio de estado con Optimistic UI
  const handleUpdateStatus = (
    id: string,
    newStatus: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  ) => {
    startTransition(async () => {
      setOptimisticAppointments({ id, newStatus });
      await updateAppointmentStatusAction(id, newStatus);
    });
  };

  const formattedSelectedDate = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${selectedDate}T12:00:00`));

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. PANEL DE COMANDO DE FECHA + CINTA DE 7 DÍAS
      ====================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37]">
                AGENDA OPERATIVA
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sincronización Activa</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6] capitalize">
              {formattedSelectedDate}
            </h1>
          </div>

          {/* Controles de Fecha y Nuevo Turno */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/90 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => changeDateByDays(-1)}
                aria-label="Día anterior"
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 font-mono text-xs sm:text-sm font-bold bg-transparent text-zinc-900 dark:text-[#f4efe6] focus:outline-none min-h-[40px]"
              />
              <button
                onClick={() => changeDateByDays(1)}
                aria-label="Día siguiente"
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={setDateToToday}
                className="px-3 py-1.5 font-mono text-xs font-bold uppercase rounded-xl bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-[#d4af37] hover:bg-[#d4af37] hover:text-zinc-950 transition-colors min-h-[38px] cursor-pointer"
              >
                Hoy
              </button>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              title="Sincronizar con Mercado Pago ahora"
              aria-label="Sincronizar turnos"
              className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-[#d4af37] transition-colors min-h-[46px] min-w-[46px] flex items-center justify-center cursor-pointer"
            >
              <RotateCcw
                className={`w-4 h-4 ${
                  isSyncing || isPending ? 'animate-spin text-[#d4af37]' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-lg shadow-[#d4af37]/20 hover:shadow-[#d4af37]/35 transition-all min-h-[46px] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nuevo Turno Presencial</span>
            </button>
          </div>
        </div>

        {/* Cinta Rápida de 7 Días */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickDays.map((qd) => {
            const active = qd.dateStr === selectedDate;
            return (
              <button
                key={qd.dateStr}
                type="button"
                onClick={() => setSelectedDate(qd.dateStr)}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border min-w-[115px] transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-zinc-950 dark:bg-[#d4af37] text-white dark:text-zinc-950 border-zinc-950 dark:border-[#d4af37] shadow-md'
                    : 'bg-zinc-50/70 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:border-[#d4af37]/50'
                }`}
              >
                <div className="text-left">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider block ${
                      active
                        ? 'text-[#d4af37] dark:text-zinc-800 font-bold'
                        : 'text-zinc-400'
                    }`}
                  >
                    {qd.isToday ? 'HOY' : qd.dayShort}
                  </span>
                  <span className="font-mono text-base font-extrabold leading-tight block">
                    {qd.dayNum}
                  </span>
                </div>
                <span
                  className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    active
                      ? 'bg-white/15 dark:bg-zinc-950/20 text-white dark:text-zinc-950'
                      : qd.count > 0
                      ? 'bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37]'
                      : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {qd.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. TARJETAS KPI EJECUTIVAS DEL DÍA
      ====================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Turnos */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 flex items-start justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 block">
              01 // CITAS ACTIVAS
            </span>
            <span className="font-mono text-3xl font-extrabold text-zinc-950 dark:text-[#f4efe6] mt-2 block">
              {dayStats.total}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 block">
              Reservados para esta fecha
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Por Atender */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 flex items-start justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37] font-semibold block">
              02 // POR ATENDER
            </span>
            <span className="font-mono text-3xl font-extrabold text-[#b38f2d] dark:text-[#d4af37] mt-2 block">
              {dayStats.confirmed}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 block">
              Confirmados en espera
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#b38f2d] dark:text-[#d4af37]">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Completados */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 flex items-start justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-semibold block">
              03 // COMPLETADOS
            </span>
            <span className="font-mono text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 block">
              {dayStats.completed}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 block">
              Clientes atendidos hoy
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Facturación del Día */}
        <div className="p-5 rounded-3xl bg-zinc-950 text-[#f4efe6] border border-[#d4af37]/40 flex items-start justify-between shadow-lg shadow-[#d4af37]/5">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-semibold block">
              04 // CAJA DE AGENDA
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#d4af37] mt-2 block">
              ${dayStats.revenue.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-zinc-400 mt-1 block">
              Facturación del día
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#d4af37] text-zinc-950 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. BARRA DE BÚSQUEDA Y FILTRO DE ESTADOS
      ====================================================================== */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente por nombre, WhatsApp o servicio..."
            className="w-full pl-10 pr-4 py-2.5 text-base md:text-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] placeholder:text-zinc-400 focus:ring-2 focus:ring-[#d4af37] focus:outline-none min-h-[44px]"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'CONFIRMED', label: 'Confirmados' },
            { id: 'COMPLETED', label: 'Atendidos' },
            { id: 'RESCHEDULED', label: 'Reprogramados' },
            { id: 'CANCELLED', label: 'Cancelados' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all min-h-[42px] cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-zinc-950 dark:bg-[#d4af37] text-white dark:text-zinc-950 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-[#f4efe6]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          4. LISTADO HÍBRIDO DE TURNOS (CARDS EN MÓVIL / TABLA EN DESKTOP)
      ====================================================================== */}
      {filteredAppointments.length === 0 ? (
        <div className="p-14 text-center rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/25 text-[#d4af37] flex items-center justify-center mx-auto">
            <Scissors className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-[#f4efe6]">
            Sin turnos registrados para esta vista
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Seleccioná otro día en la cinta superior o cargá un turno presencial con el
            botón dorado.
          </p>
        </div>
      ) : (
        <>
          {/* VISTA MÓVIL: Tarjetas Ejecutivas (< md) */}
          <div className="grid grid-cols-1 gap-3.5 md:hidden">
            {filteredAppointments.map((app) => {
              const startH = new Intl.DateTimeFormat('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(new Date(app.startTime));
              const statusMeta = getStatusMeta(app.status);

              return (
                <div
                  key={app.id}
                  className="p-5 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-2 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 text-center">
                        <span className="font-mono text-sm font-extrabold text-[#b38f2d] dark:text-[#d4af37] block">
                          {startH}
                        </span>
                        <span className="font-mono text-[9px] uppercase text-zinc-400 block">
                          HS
                        </span>
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-zinc-950 dark:text-[#f4efe6]">
                          {app.customerName}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                          <Scissors className="w-3 h-3 text-[#d4af37]" />
                          <span>{app.serviceName}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#d4af37]" />
                      {app.customerPhone}
                    </span>
                    <div className="text-right">
                      <span className="font-mono font-extrabold text-sm text-zinc-950 dark:text-[#d4af37]">
                        ${Number(app.price).toLocaleString('es-AR')}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 block">
                        {getPaymentMethodBadge(app.paymentMethod)}
                      </span>
                    </div>
                  </div>

                  {/* Acciones en Mobile */}
                  <div className="pt-1 flex flex-wrap items-center justify-end gap-2">
                    {app.status !== 'COMPLETED' && app.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(app.id, 'COMPLETED')}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 min-h-[44px] flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Atendido</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setRescheduleTarget(app)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30 min-h-[44px] flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Mover</span>
                    </button>

                    <WhatsAppAlertButton
                      customerPhone={app.customerPhone}
                      customerName={app.customerName}
                      serviceName={app.serviceName}
                      startTime={app.startTime}
                      variant="reminder"
                    />

                    {app.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(app.id, 'CANCELLED')}
                        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Cancelar turno"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISTA DESKTOP: Tabla Ejecutiva (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#100f13] shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50/80 dark:bg-zinc-900/70 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 font-semibold">Horario</th>
                  <th className="px-5 py-4 font-semibold">Cliente</th>
                  <th className="px-5 py-4 font-semibold">Servicio</th>
                  <th className="px-5 py-4 font-semibold">WhatsApp</th>
                  <th className="px-5 py-4 font-semibold">Importe / Medio</th>
                  <th className="px-5 py-4 font-semibold">Estado</th>
                  <th className="px-5 py-4 font-semibold text-right">
                    Gestión Rápida
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredAppointments.map((app) => {
                  const startH = new Intl.DateTimeFormat('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(new Date(app.startTime));
                  const statusMeta = getStatusMeta(app.status);

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 font-mono text-sm font-extrabold text-[#b38f2d] dark:text-[#d4af37] px-2.5 py-1 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/25">
                          <Clock className="w-3.5 h-3.5" />
                          {startH} hs
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-zinc-950 dark:text-[#f4efe6]">
                        {app.customerName}
                      </td>
                      <td className="px-5 py-4 text-zinc-700 dark:text-zinc-300 font-medium">
                        {app.serviceName}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {app.customerPhone}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono font-extrabold text-zinc-950 dark:text-[#f4efe6] block">
                          ${Number(app.price).toLocaleString('es-AR')}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400 uppercase">
                          {getPaymentMethodBadge(app.paymentMethod)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`}
                          />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {app.status !== 'COMPLETED' &&
                            app.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(app.id, 'COMPLETED')
                                }
                                title="Marcar turno como atendido"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500 hover:text-zinc-950 transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Atendido</span>
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() => setRescheduleTarget(app)}
                            title="Cambiar fecha u horario"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#d4af37]/10 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#d4af37] hover:text-zinc-950 transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Mover</span>
                          </button>

                          <WhatsAppAlertButton
                            customerPhone={app.customerPhone}
                            customerName={app.customerName}
                            serviceName={app.serviceName}
                            startTime={app.startTime}
                            variant="reminder"
                          />

                          {app.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatus(app.id, 'CANCELLED')
                              }
                              title="Cancelar turno"
                              className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal de Reprogramación */}
      <RescheduleModal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        appointment={rescheduleTarget}
      />

      {/* Modal de Carga Manual de Turno */}
      <ManualAppointmentModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        services={services}
      />
    </div>
  );
}
