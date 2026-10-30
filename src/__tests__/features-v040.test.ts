import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getArgentinaCalendarDays,
  calculateOrderAccounting,
  validateMultiSlotCart,
} from '../utils/dateHelpers';

describe('5. Fix Bug Domingo UTC-3 (Desfase después de las 21:00 hs Argentina) & Calendario 30 Días', () => {
  it('mantiene dateStr en el día local de Argentina incluso pasadas las 21:00 hs (00:00+ UTC)', () => {
    // Jueves 29 de Octubre de 2026 a las 22:45 hs en Catamarca (01:45 UTC del Viernes 30)
    const lateNightArgentina = new Date('2026-10-29T22:45:00-03:00');
    const days = getArgentinaCalendarDays(30, [0], lateNightArgentina);

    assert.equal(days.length, 30);

    // Día 0: Jueves 29 de Octubre (NO debe saltar a 2026-10-30 por culpa de toISOString)
    assert.equal(days[0].dateStr, '2026-10-29');
    assert.equal(days[0].dayNumber, 29);
    assert.equal(days[0].dayOfWeek, 4); // Jueves
    assert.equal(days[0].isClosed, false);

    // Día 3: Domingo 1 de Noviembre (NO debe tener dateStr = 2026-11-02 Lunes)
    assert.equal(days[3].dateStr, '2026-11-01');
    assert.equal(days[3].dayNumber, 1);
    assert.equal(days[3].dayOfWeek, 0); // Domingo
    assert.equal(days[3].isClosed, true); // Cerrado porque 0 está en closedDaysOfWeek
  });
});

describe('6. Contabilidad de Tienda Online & Cadete (Catamarca Capital, Valle Viejo, Sumalao)', () => {
  it('cobra Producto + Cadete en Mercado Pago pero registra solo el Producto en la Caja de Diogo', () => {
    const items = [
      { productId: 'p1', name: 'Cera Mate Efecto Seco', unitPrice: 12000, quantity: 1 },
      { productId: 'p2', name: 'Aceite Hidratante de Barba', unitPrice: 15000, quantity: 2 },
    ];
    const cadeteFeeValleViejo = 3500;

    const result = calculateOrderAccounting(items, cadeteFeeValleViejo);

    // Subtotal de productos de Diogo: 12000 + (15000 * 2) = 42000
    assert.equal(result.productsSubtotal, 42000);
    // Costo del cadete: 3500
    assert.equal(result.shippingCost, 3500);
    // Total que paga el cliente en Mercado Pago: 45500
    assert.equal(result.mercadoPagoTotal, 45500);
    // Plata que entra a las finanzas (Caja) de Diogo: SOLO 42000 (excluye lo del cadete)
    assert.equal(result.barbershopCashIncome, 42000);
    assert.equal(result.courierPayout, 3500);
  });
});

describe('7. Carrito Multi-Turnos (Venir con un amigo o Pack de 3-4 cortes al mes) + Upselling', () => {
  it('permite reservar 2 turnos el mismo día para ir con un amigo o varios días del mes y suma productos sugeridos', () => {
    const slots = [
      { dateStr: '2026-11-03', timeStr: '18:00', label: 'Titular' },
      { dateStr: '2026-11-03', timeStr: '18:30', label: 'Amigo' },
      { dateStr: '2026-11-17', timeStr: '18:00', label: '2do Corte del Mes' },
    ];
    const products = [{ productId: 'cera-1', name: 'Cera Mate', unitPrice: 12000, quantity: 1 }];

    const summary = validateMultiSlotCart(slots, 25000, products);

    assert.equal(summary.valid, true);
    assert.equal(summary.slotsCount, 3);
    assert.equal(summary.appointmentsSubtotal, 75000);
    assert.equal(summary.productsSubtotal, 12000);
    assert.equal(summary.grandTotal, 87000);
  });

  it('rechaza si se intenta agregar dos veces exactamente la misma fecha y hora al carrito', () => {
    const duplicateSlots = [
      { dateStr: '2026-11-03', timeStr: '18:00' },
      { dateStr: '2026-11-03', timeStr: '18:00' },
    ];

    const summary = validateMultiSlotCart(duplicateSlots, 25000, []);
    assert.equal(summary.valid, false);
    assert.match(summary.error || '', /mismo horario/i);
  });
});

