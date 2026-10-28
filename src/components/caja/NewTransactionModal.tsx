'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { createTransactionAction } from '@/app/actions/cashActions';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function NewTransactionModal({
  isOpen,
  onClose,
  onCreated,
}: NewTransactionModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [category, setCategory] = useState<string>('SUPPLIES');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'MERCADOPAGO'>('CASH');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayStr);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTypeChange = (newType: 'INCOME' | 'EXPENSE') => {
    setType(newType);
    setCategory(newType === 'INCOME' ? 'PRODUCT_SALE' : 'SUPPLIES');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Por favor ingresá un monto válido mayor a 0.');
      return;
    }

    if (!description.trim()) {
      setError('Por favor ingresá una descripción del movimiento.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createTransactionAction({
        type,
        category: category as any,
        amount: numAmount,
        paymentMethod,
        description,
        transactionDate,
      });

      if (res.success) {
        if (onCreated) onCreated();
        onClose();
        // Reset form
        setAmount('');
        setDescription('');
      } else {
        setError(res.error || 'No se pudo guardar el movimiento.');
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Movimiento de Caja"
      description="Cargá un ingreso (ej. venta de cera) o un gasto operativo (ej. insumos, alquiler)."
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tipo de Movimiento: Ingreso o Egreso */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange('INCOME')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${
              type === 'INCOME'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Ingreso (+)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('EXPENSE')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${
              type === 'EXPENSE'
                ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-50'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Egreso / Gasto (-)</span>
          </button>
        </div>

        {/* Categoría */}
        <div className="space-y-1.5">
          <label
            htmlFor="category-select"
            className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
          >
            Categoría del Movimiento <span className="text-rose-500">*</span>
          </label>
          <select
            id="category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
          >
            {type === 'INCOME' ? (
              <>
                <option value="PRODUCT_SALE">Venta de Productos (Ceras, Aceites, Pomadas)</option>
                <option value="APPOINTMENT">Cobro de Turno / Servicio Extra</option>
                <option value="OTHER_INCOME">Otros Ingresos</option>
              </>
            ) : (
              <>
                <option value="SUPPLIES">Insumos Descartables (Filos, Hojas, Talco, Toallas)</option>
                <option value="PRODUCTS_STOCK">Compra de Mercadería / Stock para Reventa</option>
                <option value="RENT">Alquiler del Local</option>
                <option value="SERVICES">Servicios Públicos (Luz, Agua, Internet, Gas)</option>
                <option value="MAINTENANCE">Mantenimiento y Afilado de Máquinas</option>
                <option value="WITHDRAWAL">Retiro de Ganancias del Dueño</option>
                <option value="OTHER_EXPENSE">Otros Gastos Operativos</option>
              </>
            )}
          </select>
        </div>

        {/* Monto y Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="amount-input"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Monto ($ ARS) <span className="text-rose-500">*</span>
            </label>
            <input
              id="amount-input"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="tx-date-input"
              className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
            >
              Fecha <span className="text-rose-500">*</span>
            </label>
            <input
              id="tx-date-input"
              type="date"
              required
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Medio de Pago */}
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
            Medio de Pago <span className="text-rose-500">*</span>
          </span>
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
                {method === 'CASH' ? 'Efectivo' : method === 'TRANSFER' ? 'Transferencia' : 'Mercado Pago'}
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <label
            htmlFor="desc-input"
            className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
          >
            Descripción o Detalle <span className="text-rose-500">*</span>
          </label>
          <input
            id="desc-input"
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Compra de 5 cajas de hojas Derby / Venta pomada mate"
            className="w-full px-3 py-2 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-[44px] focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Botones */}
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
              <span>Registrar Movimiento</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
