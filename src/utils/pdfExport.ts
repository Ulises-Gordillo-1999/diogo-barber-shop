import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportTransactionItem {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  paymentMethod: string;
  description: string;
  transactionDate: Date | string;
}

export interface ExportBalanceParams {
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

export function exportBalanceToPdf({
  periodLabel,
  totalIncome,
  totalExpense,
  netProfit,
  incomeByMethod,
  transactions,
}: ExportBalanceParams) {
  const doc = new jsPDF();

  // 1. Encabezado con estética de Barbería
  doc.setFillColor(24, 24, 27); // #18181b (zinc-900)
  doc.rect(0, 0, 210, 38, 'F');

  // Título Barbería
  doc.setTextColor(245, 158, 11); // #f59e0b (amber-500)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DIOGO BARBER SHOP', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(228, 228, 231); // zinc-200
  doc.text('Reporte Financiero & Cierre de Caja • @diogobarbershopp', 14, 25);

  const todayStr = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  doc.setFontSize(8);
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text(`Fecha de Emisión: ${todayStr}`, 14, 32);

  // 2. Información del Período
  doc.setTextColor(39, 39, 42); // zinc-800
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Período Evaluado: ${periodLabel}`, 14, 48);

  // 3. Resumen de Métricas (Tarjetas / Cajas)
  // Caja 1: Ingresos
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(14, 53, 58, 22, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL INGRESOS', 18, 61);
  doc.setFontSize(13);
  doc.text(`$${totalIncome.toLocaleString('es-AR')}`, 18, 70);

  // Caja 2: Egresos
  doc.setFillColor(255, 241, 242); // rose-50
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(76, 53, 58, 22, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(190, 18, 60); // rose-700
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL EGRESOS', 80, 61);
  doc.setFontSize(13);
  doc.text(`$${totalExpense.toLocaleString('es-AR')}`, 80, 70);

  // Caja 3: Ganancia Neta
  const isNetPositive = netProfit >= 0;
  if (isNetPositive) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(252, 211, 77);
    doc.setTextColor(180, 83, 9);
  } else {
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(254, 205, 211);
    doc.setTextColor(190, 18, 60);
  }
  doc.roundedRect(138, 53, 58, 22, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BALANCE / GANANCIA NETA', 142, 61);
  doc.setFontSize(13);
  doc.text(`$${netProfit.toLocaleString('es-AR')}`, 142, 70);

  // 4. Desglose por Medio de Pago
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 91);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Desglose Ingresos: Mercado Pago: $${incomeByMethod.MERCADOPAGO.toLocaleString(
      'es-AR'
    )}  |  Efectivo: $${incomeByMethod.CASH.toLocaleString(
      'es-AR'
    )}  |  Transferencia: $${incomeByMethod.TRANSFER.toLocaleString('es-AR')}`,
    14,
    83
  );

  // 5. Tabla de Transacciones con autoTable
  const tableRows = transactions.map((tx) => {
    const d = new Date(tx.transactionDate);
    const dateFormatted = `${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const typeStr = tx.type === 'INCOME' ? 'Ingreso (+)' : 'Egreso (-)';
    const amountStr = `${tx.type === 'INCOME' ? '+' : '-'}$${tx.amount.toLocaleString('es-AR')}`;

    return [
      dateFormatted,
      typeStr,
      tx.category,
      tx.description,
      tx.paymentMethod,
      amountStr,
    ];
  });

  autoTable(doc, {
    startY: 88,
    head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Medio', 'Monto']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [245, 158, 11],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 30, fontSize: 7 },
      1: { cellWidth: 22, fontSize: 8, fontStyle: 'bold' },
      2: { cellWidth: 30, fontSize: 7 },
      3: { cellWidth: 60, fontSize: 8 },
      4: { cellWidth: 24, fontSize: 7 },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold', fontSize: 8 },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Colorear verde para Ingresos y rojo para Egresos en la columna de monto
      if (data.section === 'body' && data.column.index === 5) {
        const textVal = String(data.cell.raw);
        if (textVal.startsWith('+')) {
          data.cell.styles.textColor = [21, 128, 61];
        } else {
          data.cell.styles.textColor = [190, 18, 60];
        }
      }
    },
  });

  // Guardar y descargar automáticamente
  const fileName = `Diogo_Barber_Cierre_Caja_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
