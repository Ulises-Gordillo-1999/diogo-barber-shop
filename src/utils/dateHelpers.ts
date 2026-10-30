export interface CalendarDayOption {
  dateStr: string; // "YYYY-MM-DD" en America/Argentina/Catamarca
  dayOfWeek: number; // 0 = Domingo ... 6 = Sábado
  dayName: string; // "Jue", "Vie", "Dom"
  dayNumber: number; // 1..31
  monthName: string; // "oct", "nov"
  isToday: boolean;
  isClosed: boolean;
}

export interface OrderCartItemInput {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface MultiSlotItemInput {
  dateStr: string;
  timeStr: string;
  label?: string;
}

const ARGENTINA_TZ = 'America/Argentina/Catamarca';

/**
 * Obtiene el string "YYYY-MM-DD" exacto en la zona horaria de Catamarca / Argentina (UTC-3),
 * evitando que `toISOString()` salte al día siguiente pasadas las 21:00 hs de Argentina (00:00 UTC).
 */
export function formatDateStrArgentina(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

/**
 * Genera los próximos `daysCount` días (ej. 30 días para reservas mensuales)
 * anclados al mediodía de Argentina (UTC-3) para evitar cualquier desfase horario,
 * marcando como `isClosed: true` los días de la semana cerrados (por defecto Domingo = 0).
 */
export function getArgentinaCalendarDays(
  daysCount: number = 30,
  closedDaysOfWeek: number[] = [0],
  baseDate: Date = new Date()
): CalendarDayOption[] {
  const todayStr = formatDateStrArgentina(baseDate);
  const todayNoonArgentina = new Date(`${todayStr}T12:00:00-03:00`);
  const closedSet = new Set(closedDaysOfWeek);

  return Array.from({ length: daysCount }).map((_, index) => {
    const d = new Date(todayNoonArgentina.getTime() + index * 24 * 60 * 60 * 1000);
    const dateStr = formatDateStrArgentina(d);
    const dayOfWeek = d.getUTCDay(); // A las 12:00-03:00 son las 15:00 UTC del mismo día exacto

    const rawDayName = new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      timeZone: ARGENTINA_TZ,
    })
      .format(d)
      .replace('.', '');

    const dayNumber = Number(dateStr.split('-')[2]);

    const monthName = new Intl.DateTimeFormat('es-AR', {
      month: 'short',
      timeZone: ARGENTINA_TZ,
    })
      .format(d)
      .replace('.', '');

    return {
      dateStr,
      dayOfWeek,
      dayName: rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1),
      dayNumber,
      monthName,
      isToday: index === 0,
      isClosed: closedSet.has(dayOfWeek),
    };
  });
}

/**
 * Separa contablemente el pago total de Mercado Pago entre:
 * - `barbershopCashIncome`: Lo que ingresa a la Caja de Diogo (únicamente los productos).
 * - `courierPayout`: Lo que corresponde al cadete (Catamarca Capital, Valle Viejo, Sumalao, etc.),
 *   que se cobra en el total de Mercado Pago pero NO infla las ganancias de la barbería.
 */
export function calculateOrderAccounting(
  items: OrderCartItemInput[],
  shippingCost: number = 0
): {
  productsSubtotal: number;
  shippingCost: number;
  mercadoPagoTotal: number;
  barbershopCashIncome: number;
  courierPayout: number;
} {
  const safeShipping = Math.max(0, Number(shippingCost) || 0);
  const productsSubtotal = items.reduce((acc, item) => {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const price = Math.max(0, Number(item.unitPrice) || 0);
    return acc + price * qty;
  }, 0);

  return {
    productsSubtotal,
    shippingCost: safeShipping,
    mercadoPagoTotal: productsSubtotal + safeShipping,
    barbershopCashIncome: productsSubtotal,
    courierPayout: safeShipping,
  };
}

/**
 * Valida un carrito de múltiples turnos (para venir con un amigo el mismo día o
 * agendar 3-4 cortes en el mes) más productos adicionales sugeridos (upselling).
 */
export function validateMultiSlotCart(
  slots: MultiSlotItemInput[],
  serviceUnitPrice: number,
  attachedProducts: OrderCartItemInput[] = []
): {
  valid: boolean;
  error?: string;
  slotsCount: number;
  appointmentsSubtotal: number;
  productsSubtotal: number;
  grandTotal: number;
} {
  if (!slots || slots.length === 0) {
    return {
      valid: false,
      error: 'Debés seleccionar al menos un horario para tu reserva.',
      slotsCount: 0,
      appointmentsSubtotal: 0,
      productsSubtotal: 0,
      grandTotal: 0,
    };
  }

  if (slots.length > 8) {
    return {
      valid: false,
      error: 'Podés reservar hasta un máximo de 8 turnos en una misma operación.',
      slotsCount: slots.length,
      appointmentsSubtotal: 0,
      productsSubtotal: 0,
      grandTotal: 0,
    };
  }

  const seenKeys = new Set<string>();
  for (const s of slots) {
    if (!s.dateStr || !s.timeStr) {
      return {
        valid: false,
        error: 'Uno de los turnos seleccionados no tiene fecha u hora válida.',
        slotsCount: slots.length,
        appointmentsSubtotal: 0,
        productsSubtotal: 0,
        grandTotal: 0,
      };
    }
    const key = `${s.dateStr}_${s.timeStr}`;
    if (seenKeys.has(key)) {
      return {
        valid: false,
        error: `No podés seleccionar dos veces el mismo horario (${s.dateStr} a las ${s.timeStr} hs). Si venís con un amigo, elegí el horario siguiente consecutivo.`,
        slotsCount: slots.length,
        appointmentsSubtotal: 0,
        productsSubtotal: 0,
        grandTotal: 0,
      };
    }
    seenKeys.add(key);
  }

  const safeServicePrice = Math.max(0, Number(serviceUnitPrice) || 0);
  const appointmentsSubtotal = slots.length * safeServicePrice;
  const productsSubtotal = attachedProducts.reduce(
    (acc, p) => acc + Math.max(0, Number(p.unitPrice) || 0) * Math.max(0, Math.floor(Number(p.quantity) || 0)),
    0
  );

  return {
    valid: true,
    slotsCount: slots.length,
    appointmentsSubtotal,
    productsSubtotal,
    grandTotal: appointmentsSubtotal + productsSubtotal,
  };
}

