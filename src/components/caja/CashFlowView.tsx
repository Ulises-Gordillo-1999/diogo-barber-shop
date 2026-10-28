'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Trash2,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { FinancialKPICards } from './FinancialKPICards';
import { NewTransactionModal } from './NewTransactionModal';
import { ExportPdfButton } from './ExportPdfButton';
import { deleteTransactionAction } from '@/app/actions/cashActions';

export interface CashTransactionItem {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  paymentMethod: string;
  description: string;
  appointmentId: string | null;
  transactionDate: Date | string;
}

interface CashFlowViewProps {
  initialTransactions: CashTransactionItem[];
  isAdmin: boolean;
}

export function CashFlowView({
  initialTransactions,
  isAdmin,
}: CashFlowViewProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  // Sincronizar el estado cuando el Server Component envía nuevas transacciones
  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  // Auto-sync inteligente: cada 15s si la pestaña está activa, y al volver a la pestaña
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

  // 1. Filtrar transacciones por período de tiempo
  const periodFiltered = useMemo(() => {
    const now = new Date();

    return transactions.filter((tx) => {
      const txDate = new Date(tx.transactionDate);

      if (period === 'today') {
        return (
          txDate.getDate() === now.getDate() &&
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return txDate >= startOfWeek;
      }

      if (period === 'month') {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [transactions, period]);

  // 2. Filtrar reactivamente por tipo, método y búsqueda
  const finalFiltered = useMemo(() => {
    return periodFiltered.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (methodFilter !== 'ALL' && tx.paymentMethod !== methodFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        if (!matchDesc && !matchCat) return false;
      }

      return true;
    });
  }, [periodFiltered, typeFilter, methodFilter, searchQuery]);

  // 3. Cálculos de KPIs financieros para el período seleccionado
  const kpiStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    const byMethod = {
      MERCADOPAGO: 0,
      CASH: 0,
      TRANSFER: 0,
    };

    for (const tx of periodFiltered) {
      if (tx.type === 'INCOME') {
        income += tx.amount;
        incomeCount++;

        if (tx.paymentMethod in byMethod) {
          byMethod[tx.paymentMethod as keyof typeof byMethod] += tx.amount;
        }
      } else {
        expense += tx.amount;
        expenseCount++;
      }
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      netProfit: income - expense,
      incomeCount,
      expenseCount,
      byMethod,
    };
  }, [periodFiltered]);

  const periodLabel = useMemo(() => {
    if (period === 'today') return 'Hoy';
    if (period === 'week') return 'Esta Semana';
    if (period === 'month') {
      return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(
        new Date()
      );
    }
    return 'Histórico Completo';
  }, [period]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      await deleteTransactionAction(id);
    });
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'APPOINTMENT':
        return 'Turno Barbería';
      case 'PRODUCT_SALE':
        return 'Venta Producto';
      case 'SUPPLIES':
        return 'Insumos / Filos';
      case 'PRODUCTS_STOCK':
        return 'Stock Reventa';
      case 'RENT':
        return 'Alquiler';
      case 'SERVICES':
        return 'Servicios / Internet';
      case 'MAINTENANCE':
        return 'Mantenimiento';
      case 'WITHDRAWAL':
        return 'Retiro Dueño';
      default:
        return 'Varios';
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Título y Acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37]">
              TESORERÍA & FINANZAS
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>En vivo</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
            Caja & Libro Mayor
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Ingresos acreditados automáticamente por Mercado Pago, cobros en el local y
            control de gastos con exportación en PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleManualSync}
            title="Sincronizar caja ahora"
            aria-label="Sincronizar caja"
            className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-[#d4af37] transition-colors min-h-[46px] min-w-[46px] flex items-center justify-center cursor-pointer"
          >
            <RotateCcw
              className={`w-4 h-4 ${
                isSyncing || isPending ? 'animate-spin text-[#d4af37]' : ''
              }`}
            />
          </button>

          <ExportPdfButton
            periodLabel={periodLabel}
            totalIncome={kpiStats.totalIncome}
            totalExpense={kpiStats.totalExpense}
            netProfit={kpiStats.netProfit}
            incomeByMethod={kpiStats.byMethod}
            transactions={finalFiltered}
          />

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-lg shadow-[#d4af37]/20 transition-all min-h-[46px] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Selector de Período Temporal */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs overflow-x-auto scrollbar-none">
        {(
          [
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mes' },
            { id: 'all', label: 'Histórico Completo' },
          ] as const
        ).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[40px] whitespace-nowrap cursor-pointer ${
              period === p.id
                ? 'bg-zinc-950 dark:bg-[#d4af37] text-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-[#f4efe6]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Tarjetas KPI Financieras */}
      <FinancialKPICards
        totalIncome={kpiStats.totalIncome}
        totalExpense={kpiStats.totalExpense}
        netProfit={kpiStats.netProfit}
        incomeCount={kpiStats.incomeCount}
        expenseCount={kpiStats.expenseCount}
        byMethod={kpiStats.byMethod}
      />

      {/* Buscador y Filtros */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por concepto, cliente o categoría..."
              className="w-full pl-10 pr-4 py-2.5 text-base md:text-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] min-h-[44px]"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Filtro de Tipo */}
            <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
              {(
                [
                  { id: 'ALL', label: 'Todos' },
                  { id: 'INCOME', label: 'Ingresos' },
                  { id: 'EXPENSE', label: 'Gastos' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] cursor-pointer ${
                    typeFilter === t.id
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-[#d4af37] shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filtro de Medio */}
            <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
              {(
                [
                  { id: 'ALL', label: 'Todos' },
                  { id: 'MERCADOPAGO', label: 'MP' },
                  { id: 'CASH', label: 'Efectivo' },
                  { id: 'TRANSFER', label: 'Transf.' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethodFilter(m.id)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] cursor-pointer ${
                    methodFilter === m.id
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-[#d4af37] shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* VISTA HÍBRIDA DE MOVIMIENTOS */}
      {finalFiltered.length === 0 ? (
        <div className="p-14 text-center rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 space-y-2">
          <FileText className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            No se encontraron movimientos en este período
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Cargá un nuevo ingreso o gasto con el botón dorado superior.
          </p>
        </div>
      ) : (
        <>
          {/* VISTA MÓVIL: Tarjetas (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {finalFiltered.map((tx) => {
              const d = new Date(tx.transactionDate);
              const dateStr = d.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
              });
              const timeStr = d.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isIncome = tx.type === 'INCOME';

              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[11px] text-zinc-400 block">
                        {dateStr} • {timeStr} hs
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-[#f4efe6] mt-0.5">
                        {tx.description}
                      </h4>
                    </div>

                    <span
                      className={`font-mono text-base font-extrabold ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}${tx.amount.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37]">
                        {getCategoryLabel(tx.category)}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {tx.paymentMethod}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(tx.id)}
                        className="text-zinc-400 hover:text-rose-500 p-1.5 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Eliminar movimiento"
                      >
                        <Trash2 className="w-4 h-4" />
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
                  <th className="px-5 py-4 font-semibold">Fecha & Hora</th>
                  <th className="px-5 py-4 font-semibold">Tipo</th>
                  <th className="px-5 py-4 font-semibold">Categoría</th>
                  <th className="px-5 py-4 font-semibold">Concepto / Detalle</th>
                  <th className="px-5 py-4 font-semibold">Medio</th>
                  <th className="px-5 py-4 font-semibold text-right">Importe</th>
                  {isAdmin && (
                    <th className="px-5 py-4 font-semibold text-right">Acción</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {finalFiltered.map((tx) => {
                  const d = new Date(tx.transactionDate);
                  const dateFormatted = `${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString(
                    'es-AR',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}`;
                  const isIncome = tx.type === 'INCOME';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {dateFormatted}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25'
                          }`}
                        >
                          {isIncome ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {isIncome ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-[#b38f2d] dark:text-[#d4af37] font-semibold">
                        {getCategoryLabel(tx.category)}
                      </td>
                      <td className="px-5 py-4 font-bold text-zinc-950 dark:text-[#f4efe6]">
                        {tx.description}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs uppercase text-zinc-500 dark:text-zinc-400">
                        {tx.paymentMethod}
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono text-base font-extrabold ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}${tx.amount.toLocaleString('es-AR')}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal para Crear Movimiento */}
      <NewTransactionModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />
    </div>
  );
}
