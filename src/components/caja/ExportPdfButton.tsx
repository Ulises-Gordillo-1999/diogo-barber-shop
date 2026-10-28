'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { exportBalanceToPdf, type ExportTransactionItem } from '@/utils/pdfExport';

interface ExportPdfButtonProps {
  periodLabel: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeByMethod: {
    MERCADOPAGO: number;
    CASH: number;
    TRANSFER: number;
  };
  transactions: ExportTransactionItem[];
}

export function ExportPdfButton({
  periodLabel,
  totalIncome,
  totalExpense,
  netProfit,
  incomeByMethod,
  transactions,
}: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportBalanceToPdf({
        periodLabel,
        totalIncome,
        totalExpense,
        netProfit,
        incomeByMethod,
        transactions,
      });
    } catch (err) {
      console.error('Error al generar PDF de balance:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isExporting || transactions.length === 0}
      onClick={handleExport}
      title="Descargar balance en PDF"
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700/80 shadow-xs disabled:opacity-40 transition-all min-h-[44px] cursor-pointer"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>Generando PDF...</span>
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4 text-amber-500" />
          <span>Exportar Balance PDF</span>
        </>
      )}
    </button>
  );
}
