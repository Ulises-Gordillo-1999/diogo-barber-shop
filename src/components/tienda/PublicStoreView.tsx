'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Truck,
  Store,
  MapPin,
  CreditCard,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  User,
} from 'lucide-react';
import { createStoreOrderCheckoutAction } from '@/app/actions/productActions';
import type { Product, ShippingZone } from '@/db/schema';

interface PublicStoreViewProps {
  products: Product[];
  shippingZones: ShippingZone[];
  preselectedProductId?: string;
}

export function PublicStoreView({
  products,
  shippingZones,
  preselectedProductId,
}: PublicStoreViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [cart, setCart] = useState<Record<string, number>>(() => {
    if (preselectedProductId) {
      const found = products.find((p) => p.id === preselectedProductId && p.stock > 0);
      if (found) return { [found.id]: 1 };
    }
    return {};
  });

  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'COURIER'>('PICKUP');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    shippingZones[0]?.id || ''
  );
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) => categoryFilter === 'ALL' || p.category === categoryFilter
    );
  }, [products, categoryFilter]);

  const cartDetails = useMemo(() => {
    const items: Array<{ product: Product; quantity: number; lineTotal: number }> = [];
    let productsSubtotal = 0;

    for (const [productId, qty] of Object.entries(cart)) {
      if (qty <= 0) continue;
      const prod = products.find((p) => p.id === productId);
      if (!prod) continue;
      const safeQty = Math.min(qty, prod.stock);
      if (safeQty <= 0) continue;
      const lineTotal = Number(prod.price) * safeQty;
      productsSubtotal += lineTotal;
      items.push({ product: prod, quantity: safeQty, lineTotal });
    }

    const activeZone =
      deliveryType === 'COURIER'
        ? shippingZones.find((z) => z.id === selectedZoneId) || null
        : null;

    const shippingCost = activeZone ? Number(activeZone.price) : 0;
    const grandTotal = productsSubtotal + shippingCost;

    return {
      items,
      productsSubtotal,
      activeZone,
      shippingCost,
      grandTotal,
    };
  }, [cart, products, deliveryType, selectedZoneId, shippingZones]);

  const updateCartQty = (product: Product, delta: number) => {
    setErrorMessage(null);
    setCart((prev) => {
      const current = prev[product.id] || 0;
      const next = Math.max(0, Math.min(product.stock, current + delta));
      const updated = { ...prev };
      if (next === 0) {
        delete updated[product.id];
      } else {
        updated[product.id] = next;
      }
      return updated;
    });
  };

  const handleCheckout = () => {
    if (cartDetails.items.length === 0) {
      setErrorMessage('Agregá al menos un producto a tu carrito para continuar.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Por favor completá tu nombre y tu WhatsApp.');
      return;
    }

    if (deliveryType === 'COURIER' && !shippingAddress.trim()) {
      setErrorMessage(
        'Por favor ingresá tu dirección exacta (calle, número y barrio) para el envío con cadete.'
      );
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const res = await createStoreOrderCheckoutAction({
        customerName,
        customerPhone,
        deliveryType,
        shippingZoneId: deliveryType === 'COURIER' ? selectedZoneId : undefined,
        shippingAddress: deliveryType === 'COURIER' ? shippingAddress : undefined,
        shippingNotes: deliveryType === 'COURIER' ? shippingNotes : undefined,
        cartItems: cartDetails.items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      });

      if (res.success && res.initPoint) {
        window.location.href = res.initPoint;
      } else {
        setErrorMessage(res.error || 'No se pudo procesar tu pedido.');
      }
    });
  };

  return (
    <div className="space-y-8 text-left">
      {/* Banner de Cobertura de Envíos por Cadete */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#b38f2d] dark:text-[#d4af37] shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#b38f2d] dark:text-[#d4af37] font-bold block">
              LOGÍSTICA PROPIA CON CADETE O RETIRO EN EL ESTUDIO
            </span>
            <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 mt-0.5">
              Podés retirar sin cargo en la barbería o pedir{' '}
              <strong>Envío a Domicilio con Cadete</strong> (disponible únicamente para{' '}
              <strong className="text-[#b38f2d] dark:text-[#d4af37]">
                Catamarca Capital y alrededores: Valle Viejo, Sumalao, Fray Mamerto Esquiú
              </strong>
              ).
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUMNA IZQUIERDA: Catálogo de Productos (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Filtros de Categoría */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'Todos los Productos' },
              { id: 'HAIR', label: 'Cabello (Ceras & Polvos)' },
              { id: 'BEARD', label: 'Barba (Aceites & Bálsamos)' },
              { id: 'COMBO', label: 'Cabello + Barba' },
              { id: 'ACCESSORY', label: 'Accesorios' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 min-h-[42px] transition-all cursor-pointer ${
                  categoryFilter === c.id
                    ? 'bg-[#d4af37] text-zinc-950 shadow-md shadow-[#d4af37]/20'
                    : 'bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-[#d4af37]/50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const qtyInCart = cart[product.id] || 0;
              const outOfStock = product.stock <= 0;

              return (
                <div
                  key={product.id}
                  className={`rounded-3xl border overflow-hidden flex flex-col justify-between transition-all ${
                    qtyInCart > 0
                      ? 'border-[#d4af37] bg-[#d4af37]/5 dark:bg-[#16141a] shadow-lg'
                      : 'border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#121115]'
                  }`}
                >
                  <div>
                    <div className="relative h-48 bg-zinc-900 overflow-hidden">
                      <img
                        src={product.imageUrl || '/images/interior-sillas.webp'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold bg-zinc-950/85 text-[#d4af37] border border-[#d4af37]/30 backdrop-blur-md">
                          {product.category === 'HAIR'
                            ? 'Cabello'
                            : product.category === 'BEARD'
                            ? 'Barba'
                            : product.category === 'COMBO'
                            ? 'Cabello & Barba'
                            : 'Grooming'}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold backdrop-blur-md ${
                            outOfStock
                              ? 'bg-rose-950/90 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {outOfStock ? 'Agotado' : `${product.stock} disponibles`}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-base text-zinc-900 dark:text-[#f4efe6]">
                          {product.name}
                        </h3>
                        <span className="font-mono text-xl font-extrabold text-[#b38f2d] dark:text-[#d4af37] shrink-0">
                          ${Number(product.price).toLocaleString('es-AR')}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                    {qtyInCart === 0 ? (
                      <button
                        type="button"
                        disabled={outOfStock}
                        onClick={() => updateCartQty(product, 1)}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider bg-[#d4af37] hover:bg-[#e5c158] text-zinc-950 disabled:opacity-40 transition-all min-h-[44px] cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{outOfStock ? 'Sin Stock' : 'Agregar al Carrito'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-[#d4af37]/40">
                        <button
                          type="button"
                          onClick={() => updateCartQty(product, -1)}
                          className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center hover:bg-rose-500/20 cursor-pointer"
                        >
                          {qtyInCart === 1 ? (
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Minus className="w-4 h-4" />
                          )}
                        </button>
                        <span className="font-mono text-sm font-extrabold text-[#b38f2d] dark:text-[#d4af37]">
                          {qtyInCart} en carrito
                        </span>
                        <button
                          type="button"
                          disabled={qtyInCart >= product.stock}
                          onClick={() => updateCartQty(product, 1)}
                          className="w-9 h-9 rounded-xl bg-[#d4af37] text-zinc-950 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA: Carrito, Selector de Cadete y Checkout (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="rounded-3xl bg-white dark:bg-[#121115] border border-[#d4af37]/40 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#b38f2d] dark:text-[#d4af37]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#b38f2d] dark:text-[#d4af37] block font-bold">
                    ORDEN DE COMPRA
                  </span>
                  <h2 className="text-base font-extrabold text-zinc-900 dark:text-[#f4efe6]">
                    Tu Carrito & Entrega
                  </h2>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
            </div>

            {cartDetails.items.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-zinc-400 mx-auto" />
                <p className="text-xs text-zinc-500">
                  Seleccioná los productos de la izquierda para armar tu pedido.
                </p>
              </div>
            ) : (
              <>
                {/* Items del Carrito */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {cartDetails.items.map(({ product, quantity, lineTotal }) => (
                    <div
                      key={product.id}
                      className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-[#f4efe6]">
                          {quantity}x {product.name}
                        </p>
                        <span className="font-mono text-[11px] text-zinc-500">
                          ${Number(product.price).toLocaleString('es-AR')} c/u
                        </span>
                      </div>
                      <span className="font-mono font-extrabold text-[#b38f2d] dark:text-[#d4af37]">
                        ${lineTotal.toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Selector de Modalidad de Entrega */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                    1. Modalidad de Entrega:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('PICKUP')}
                      className={`p-3 rounded-2xl border text-left transition-all min-h-[64px] cursor-pointer ${
                        deliveryType === 'PICKUP'
                          ? 'border-[#d4af37] bg-[#d4af37]/15 text-zinc-900 dark:text-[#f4efe6]'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Store className="w-4 h-4 text-[#d4af37]" />
                        <span>Retiro en Local</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                        Gratis ($0)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryType('COURIER')}
                      className={`p-3 rounded-2xl border text-left transition-all min-h-[64px] cursor-pointer ${
                        deliveryType === 'COURIER'
                          ? 'border-[#d4af37] bg-[#d4af37]/15 text-zinc-900 dark:text-[#f4efe6]'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Truck className="w-4 h-4 text-[#d4af37]" />
                        <span>Envío Cadete</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#b38f2d] dark:text-[#d4af37] block mt-1">
                        Catamarca / Alrededores
                      </span>
                    </button>
                  </div>
                </div>

                {/* Si eligió Envío con Cadete */}
                {deliveryType === 'COURIER' && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-[#d4af37]/30 space-y-3">
                    <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-[#d4af37]">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Importante:</strong> El envío por cadete es exclusivo para{' '}
                        <strong>Catamarca Capital y alrededores (Valle Viejo, Sumalao, Fray Mamerto Esquiú)</strong>.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                        Seleccioná tu Zona / Localidad *
                      </label>
                      <select
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                        className="w-full px-3 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] min-h-[44px]"
                      >
                        {shippingZones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} (+${Number(z.price).toLocaleString('es-AR')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                        Dirección Exacta (Calle, N° y Barrio) *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Ej: Av. Presidente Castillo 1450, Valle Viejo"
                        className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-zinc-500 mb-1">
                        Referencias para el Cadete (Opcional)
                      </label>
                      <input
                        type="text"
                        value={shippingNotes}
                        onChange={(e) => setShippingNotes(e.target.value)}
                        placeholder="Ej: Portón negro, tocar timbre 2B"
                        className="w-full px-3.5 py-2 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] min-h-[42px]"
                      />
                    </div>
                  </div>
                )}

                {/* Datos del Cliente */}
                <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                    2. Tus Datos de Contacto:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre y Apellido *"
                      className="w-full pl-10 pr-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] min-h-[44px]"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="WhatsApp (Ej: 3834 064982) *"
                      className="w-full pl-10 pr-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Resumen de Totales */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal Productos:</span>
                    <span>${cartDetails.productsSubtotal.toLocaleString('es-AR')}</span>
                  </div>
                  {deliveryType === 'COURIER' && (
                    <div className="flex justify-between text-[#b38f2d] dark:text-[#d4af37]">
                      <span>Envío por Cadete:</span>
                      <span>+${cartDetails.shippingCost.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-bold uppercase text-zinc-900 dark:text-white">
                      Total a Pagar:
                    </span>
                    <span className="text-2xl font-extrabold text-[#b38f2d] dark:text-[#d4af37]">
                      ${cartDetails.grandTotal.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleCheckout}
                  className="w-full inline-flex items-center justify-center gap-2 py-4 px-5 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-xl shadow-[#d4af37]/20 disabled:opacity-50 min-h-[52px] cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Abriendo Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>
                        Pagar con Mercado Pago ($
                        {cartDetails.grandTotal.toLocaleString('es-AR')})
                      </span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pago 100% protegido • Aviso directo a Diogo Barber Shop</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

