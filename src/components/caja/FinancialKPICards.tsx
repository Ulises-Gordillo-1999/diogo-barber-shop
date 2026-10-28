'use client';

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  Banknote,
  ArrowUpRight,
} from 'lucide-react';

interface FinancialKPICardsProps {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeCount: number;
  expenseCount: number;
  byMethod: {
    MERCADOPAGO: number;
    CASH: number;
    TRANSFER: number;
  };
}

export function FinancialKPICards({
  totalIncome,
  totalExpense,
  netProfit,
  incomeCount,
  expenseCount,
  byMethod,
}: FinancialKPICardsProps) {
  const isNetPositive = netProfit >= 0;
  const safeTotal = totalIncome > 0 ? totalIncome : 1;
  const mpPct = Math.round((byMethod.MERCADOPAGO / safeTotal) * 100);
  const cashPct = Math.round((byMethod.CASH / safeTotal) * 100);
  const transferPct = Math.round((byMethod.TRANSFER / safeTotal) * 100);

  return (
    <div className="space-y-4">
      {/* 3 Tarjetas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Ingresos */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-bold">
              01 // INGRESOS BRUTOS
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="font-mono text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              +${totalIncome.toLocaleString('es-AR')}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
              {incomeCount} cobros acreditados en el período
            </p>
          </div>
        </div>

        {/* Total Egresos */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 font-bold">
              02 // GASTOS OPERATIVOS
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="font-mono text-3xl sm:text-4xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
              -${totalExpense.toLocaleString('es-AR')}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
              {expenseCount} egresos registrados (insumos, servicios, etc.)
            </p>
          </div>
        </div>

        {/* Ganancia Neta (Destacada en Negro & Oro) */}
        <div className="p-6 rounded-3xl bg-zinc-950 text-[#f4efe6] border border-[#d4af37]/45 shadow-xl shadow-[#d4af37]/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-bold">
              03 // GANANCIA NETA REAL
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#d4af37] text-zinc-950 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p
              className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-tight ${
                isNetPositive ? 'text-[#d4af37]' : 'text-rose-400'
              }`}
            >
              {isNetPositive ? '+' : '-'}${Math.abs(netProfit).toLocaleString('es-AR')}
            </p>
            <p className="text-xs text-zinc-400 mt-1.5">
              {isNetPositive
                ? 'Balance neto favorable para la barbería'
                : 'Superávit negativo en este rango'}
            </p>
          </div>
        </div>
      </div>

      {/* Desglose Visual por Medio de Cobro */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#d4af37]" />
            <span>Distribución de Ingresos por Medio de Cobro</span>
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            100% Trazabilidad Automática & Presencial
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mercado Pago */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                Mercado Pago
              </span>
              <span className="font-mono text-[11px] text-sky-500 font-bold">
                {totalIncome > 0 ? `${mpPct}%` : '0%'}
              </span>
            </div>
            <div className="font-mono text-lg font-extrabold text-zinc-950 dark:text-[#f4efe6]">
              ${byMethod.MERCADOPAGO.toLocaleString('es-AR')}
            </div>
          </div>

          {/* Efectivo */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                Efectivo en Local
              </span>
              <span className="font-mono text-[11px] text-emerald-500 font-bold">
                {totalIncome > 0 ? `${cashPct}%` : '0%'}
              </span>
            </div>
            <div className="font-mono text-lg font-extrabold text-zinc-950 dark:text-[#f4efe6]">
              ${byMethod.CASH.toLocaleString('es-AR')}
            </div>
          </div>

          {/* Transferencia */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-[#d4af37]" />
                Transferencia (diogo46)
              </span>
              <span className="font-mono text-[11px] text-[#b38f2d] dark:text-[#d4af37] font-bold">
                {totalIncome > 0 ? `${transferPct}%` : '0%'}
              </span>
            </div>
            <div className="font-mono text-lg font-extrabold text-zinc-950 dark:text-[#f4efe6]">
              ${byMethod.TRANSFER.toLocaleString('es-AR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
