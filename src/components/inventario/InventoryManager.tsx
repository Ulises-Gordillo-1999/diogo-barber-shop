'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Package,
  Plus,
  Truck,
  ShoppingBag,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  MessageCircle,
  MapPin,
  Sparkles,
  DollarSign,
  Upload,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  saveProductAction,
  deleteProductAction,
  registerDirectProductSaleAction,
  saveShippingZoneAction,
  deleteShippingZoneAction,
  updateProductOrderStatusAction,
} from '@/app/actions/productActions';
import type { Product, ShippingZone, ProductOrder } from '@/db/schema';

interface InventoryManagerProps {
  initialProducts: Product[];
  initialZones: ShippingZone[];
  initialOrders: ProductOrder[];
}

const CATEGORY_LABELS: Record<string, string> = {
  HAIR: 'Cabello (Ceras / Polvos / Fijación)',
  BEARD: 'Barba (Aceites / Bálsamos)',
  COMBO: 'Cabello & Barba',
  ACCESSORY: 'Accesorios & Herramientas',
};

export function InventoryManager({
  initialProducts,
  initialZones,
  initialOrders,
}: InventoryManagerProps) {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'ORDERS' | 'ZONES'>('PRODUCTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modal de Producto (Crear / Editar)
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCat, setProdCat] = useState('HAIR');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodImg, setProdImg] = useState('/images/interior-sillas.webp');
  const [prodActive, setProdActive] = useState(true);
  const [prodFeatured, setProdFeatured] = useState(false);

  // Modal de Venta Presencial en Local
  const [saleModalProduct, setSaleModalProduct] = useState<Product | null>(null);
  const [saleQty, setSaleQty] = useState('1');
  const [saleMethod, setSaleMethod] = useState<'CASH' | 'TRANSFER' | 'MERCADOPAGO'>('CASH');
  const [saleCustomer, setSaleCustomer] = useState('');

  // Modal de Zona de Cadete
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneDesc, setZoneDesc] = useState('');
  const [zonePrice, setZonePrice] = useState('');
  const [zoneActive, setZoneActive] = useState(true);

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [initialProducts, categoryFilter, searchQuery]);

  const totalUnits = useMemo(
    () => initialProducts.reduce((acc, p) => acc + p.stock, 0),
    [initialProducts]
  );
  const totalInventoryValue = useMemo(
    () => initialProducts.reduce((acc, p) => acc + Number(p.price) * p.stock, 0),
    [initialProducts]
  );
  const paidPendingOrders = useMemo(
    () =>
      initialOrders.filter(
        (o) => o.status === 'PAID' || o.status === 'DISPATCHED'
      ).length,
    [initialOrders]
  );

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdCat('HAIR');
    setProdPrice('');
    setProdStock('10');
    setProdImg('/images/interior-sillas.webp');
    setProdActive(true);
    setProdFeatured(true);
    setProductModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDesc(p.description || '');
    setProdCat(p.category);
    setProdPrice(String(Number(p.price)));
    setProdStock(String(p.stock));
    setProdImg(p.imageUrl || '/images/interior-sillas.webp');
    setProdActive(p.active);
    setProdFeatured(p.featured);
    setProductModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProdImg(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await saveProductAction({
        id: editingProduct?.id,
        name: prodName,
        description: prodDesc,
        category: prodCat,
        price: Number(prodPrice),
        stock: Number(prodStock),
        imageUrl: prodImg,
        active: prodActive,
        featured: prodFeatured,
      });

      if (res.success) {
        setProductModalOpen(false);
        setFeedback({
          type: 'ok',
          text: editingProduct
            ? 'Producto actualizado correctamente.'
            : 'Producto agregado al inventario y tienda.',
        });
      } else {
        setFeedback({ type: 'err', text: res.error || 'Error al guardar.' });
      }
    });
  };

  const handleDeleteProduct = (id: string) => {
    startTransition(async () => {
      const res = await deleteProductAction(id);
      if (res.success) {
        setFeedback({ type: 'ok', text: 'Producto eliminado.' });
      }
    });
  };

  const handleConfirmDirectSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleModalProduct) return;

    startTransition(async () => {
      const res = await registerDirectProductSaleAction({
        productId: saleModalProduct.id,
        quantity: Number(saleQty),
        paymentMethod: saleMethod,
        customerName: saleCustomer,
      });

      if (res.success) {
        setSaleModalProduct(null);
        setSaleQty('1');
        setSaleCustomer('');
        setFeedback({
          type: 'ok',
          text: 'Venta registrada: stock descontado e ingreso acreditado en Caja & Finanzas.',
        });
      } else {
        setFeedback({ type: 'err', text: res.error || 'Error al registrar venta.' });
      }
    });
  };

  const openNewZoneModal = () => {
    setEditingZone(null);
    setZoneName('');
    setZoneDesc('Envío por cadete en el día');
    setZonePrice('3000');
    setZoneActive(true);
    setZoneModalOpen(true);
  };

  const openEditZoneModal = (z: ShippingZone) => {
    setEditingZone(z);
    setZoneName(z.name);
    setZoneDesc(z.description || '');
    setZonePrice(String(Number(z.price)));
    setZoneActive(z.active);
    setZoneModalOpen(true);
  };

  const handleSaveZone = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveShippingZoneAction({
        id: editingZone?.id,
        name: zoneName,
        description: zoneDesc,
        price: Number(zonePrice),
        active: zoneActive,
      });
      if (res.success) {
        setZoneModalOpen(false);
        setFeedback({ type: 'ok', text: 'Tarifa de zona de cadete guardada.' });
      } else {
        setFeedback({ type: 'err', text: res.error || 'Error guardando zona.' });
      }
    });
  };

  return (
    <div className="space-y-6 text-left">
      {/* Cabecera */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37] font-semibold block">
            BOUTIQUE & LOGÍSTICA LOCAL
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-[#f4efe6] mt-0.5">
            Stock de Productos, Pedidos & Envíos por Cadete
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Publicá tus ceras, aceites y productos en la web, recibí pagos por Mercado Pago y gestioná envíos en Catamarca Capital, Valle Viejo y Sumalao.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openNewProductModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-md shadow-[#d4af37]/20 min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/80">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block">
            01 // CATÁLOGO ACTIVO
          </span>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-[#f4efe6] mt-1">
            {initialProducts.filter((p) => p.active).length}
          </p>
          <span className="text-[11px] text-zinc-500">Productos publicados</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/80">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block">
            02 // STOCK DISPONIBLE
          </span>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {totalUnits} u.
          </p>
          <span className="text-[11px] text-zinc-500">Unidades en estantería</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/80">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block">
            03 // VALORIZADO EN STOCK
          </span>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#b38f2d] dark:text-[#d4af37] mt-1">
            ${totalInventoryValue.toLocaleString('es-AR')}
          </p>
          <span className="text-[11px] text-zinc-500">Mercadería lista para venta</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121115] border border-[#d4af37]/30">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] block">
            04 // PEDIDOS ACTIVOS
          </span>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-[#f4efe6] mt-1">
            {paidPendingOrders}
          </p>
          <span className="text-[11px] text-zinc-500">Pagados listos para entregar/enviar</span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('PRODUCTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex items-center gap-2 cursor-pointer ${
            activeTab === 'PRODUCTS'
              ? 'bg-[#d4af37] text-zinc-950 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catálogo & Stock ({initialProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ORDERS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex items-center gap-2 cursor-pointer ${
            activeTab === 'ORDERS'
              ? 'bg-[#d4af37] text-zinc-950 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Pedidos & Envíos ({initialOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ZONES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex items-center gap-2 cursor-pointer ${
            activeTab === 'ZONES'
              ? 'bg-[#d4af37] text-zinc-950 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Tarifas del Cadete ({initialZones.length})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTOS E INVENTARIO */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto por nombre o descripción..."
                className="w-full pl-10 pr-4 py-2.5 text-base md:text-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121115] text-zinc-900 dark:text-[#f4efe6] min-h-[44px]"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'HAIR', label: 'Cabello' },
                { id: 'BEARD', label: 'Barba' },
                { id: 'COMBO', label: 'Cabello + Barba' },
                { id: 'ACCESSORY', label: 'Accesorios' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 min-h-[42px] cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-[#d4af37] text-zinc-950'
                      : 'bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/90 overflow-hidden flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="relative h-44 bg-zinc-900 overflow-hidden">
                    <img
                      src={p.imageUrl || '/images/interior-sillas.webp'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-zinc-950/85 text-[#d4af37] border border-[#d4af37]/30 backdrop-blur-md">
                        {p.category === 'HAIR'
                          ? 'Cabello'
                          : p.category === 'BEARD'
                          ? 'Barba'
                          : p.category === 'COMBO'
                          ? 'Cabello & Barba'
                          : 'Accesorio'}
                      </span>
                      {p.featured && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-mono font-bold bg-[#d4af37] text-zinc-950">
                          ★ Destacado
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold backdrop-blur-md ${
                          p.stock > 3
                            ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/30'
                            : p.stock > 0
                            ? 'bg-amber-950/90 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-950/90 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        Stock: {p.stock} u.
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-base text-zinc-900 dark:text-[#f4efe6]">
                        {p.name}
                      </h3>
                      <span className="font-mono text-lg font-extrabold text-[#b38f2d] dark:text-[#d4af37] shrink-0">
                        ${Number(p.price).toLocaleString('es-AR')}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={p.stock <= 0}
                    onClick={() => setSaleModalProduct(p)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-400 hover:text-zinc-950 border border-emerald-500/25 transition-all min-h-[40px] disabled:opacity-40 cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Vender en Local</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditProductModal(p)}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-[#d4af37] min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                    title="Editar producto"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(p.id)}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-rose-500 hover:bg-rose-500/10 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PEDIDOS DE LA TIENDA Y ENVÍOS CON CADETE */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          {initialOrders.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
              <ShoppingBag className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Todavía no hay pedidos online registrados
              </p>
              <p className="text-xs text-zinc-500">
                Cuando un cliente compre un producto desde /tienda con Mercado Pago, aparecerá aquí con los datos de retiro o envío por cadete.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {initialOrders.map((ord) => {
                let items: Array<{ name: string; quantity: number; unitPrice: number }> = [];
                try {
                  items = JSON.parse(ord.itemsJson);
                } catch {
                  items = [];
                }

                const cleanPhone = ord.customerPhone.replace(/\D/g, '');
                const waClientText = encodeURIComponent(
                  `¡Hola ${ord.customerName}! Te escribimos de Diogo Barber Shop por tu compra de productos (${items
                    .map((i) => `${i.quantity}x ${i.name}`)
                    .join(', ')}). ${
                    ord.deliveryType === 'COURIER'
                      ? `Nuestro cadete ya está coordinando el envío hacia ${ord.shippingAddress} (${ord.shippingZoneName}).`
                      : 'Tu pedido ya está separado en la barbería para que pases a retirarlo.'
                  }`
                );

                return (
                  <div
                    key={ord.id}
                    className="p-5 rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                            ord.status === 'PAID'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : ord.status === 'DISPATCHED'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                              : ord.status === 'COMPLETED'
                              ? 'bg-zinc-500/15 text-zinc-500'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {ord.status === 'PAID'
                            ? '● PAGADO — POR ENTREGAR'
                            : ord.status === 'DISPATCHED'
                            ? '● ENVIADO CON CADETE'
                            : ord.status === 'COMPLETED'
                            ? '✓ ENTREGADO'
                            : 'PENDIENTE DE PAGO'}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37]">
                          {ord.deliveryType === 'COURIER'
                            ? `🛵 Envío por Cadete (${ord.shippingZoneName || 'Catamarca'})`
                            : '🏪 Retiro en Barbería'}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-zinc-900 dark:text-[#f4efe6]">
                        {ord.customerName} —{' '}
                        <span className="font-mono text-sm text-zinc-500">
                          {ord.customerPhone}
                        </span>
                      </h3>

                      <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
                        <p>
                          <strong>Productos:</strong>{' '}
                          {items.map((i) => `${i.quantity}x ${i.name}`).join(' + ')}
                        </p>
                        {ord.deliveryType === 'COURIER' && (
                          <p className="flex items-center gap-1.5 text-amber-700 dark:text-[#d4af37]">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              <strong>Dirección de entrega:</strong> {ord.shippingAddress}{' '}
                              {ord.shippingNotes ? `(${ord.shippingNotes})` : ''}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Desglose Contable Producto vs Cadete */}
                      <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          Ingreso Caja Diogo (Productos): $
                          {Number(ord.productsSubtotal).toLocaleString('es-AR')}
                        </span>
                        {Number(ord.shippingCost) > 0 && (
                          <span className="text-amber-600 dark:text-[#d4af37]">
                            Plata para el Cadete: $
                            {Number(ord.shippingCost).toLocaleString('es-AR')}
                          </span>
                        )}
                        <span className="text-zinc-500">
                          Total Pagado MP: ${Number(ord.totalPaid).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${waClientText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-400 hover:text-zinc-950 border border-emerald-500/30 transition-all min-h-[42px]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp Cliente</span>
                      </a>

                      {ord.status === 'PAID' && ord.deliveryType === 'COURIER' && (
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(async () => {
                              await updateProductOrderStatusAction(ord.id, 'DISPATCHED');
                            })
                          }
                          className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 min-h-[42px] cursor-pointer"
                        >
                          Despachar con Cadete
                        </button>
                      )}

                      {(ord.status === 'PAID' || ord.status === 'DISPATCHED') && (
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(async () => {
                              await updateProductOrderStatusAction(ord.id, 'COMPLETED');
                            })
                          }
                          className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#d4af37] text-zinc-950 min-h-[42px] cursor-pointer"
                        >
                          Marcar Entregado
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TARIFAS Y ZONAS DEL CADETE */}
      {activeTab === 'ZONES' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-[#f4efe6] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#d4af37]" />
                <span>Zonas de Envío por Cadete (Catamarca Capital y Alrededores)</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                Configurá cuánto cobra tu cadete según la zona. El cliente lo paga junto con el producto en Mercado Pago, pero este monto <strong>no se suma como ganancia a tu Caja</strong> para que se lo entregues directo al cadete.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewZoneModal}
              className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#d4af37] text-zinc-950 shrink-0 min-h-[42px] cursor-pointer"
            >
              + Agregar Zona
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {initialZones.map((z) => (
              <div
                key={z.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-[#f4efe6]">
                      {z.name}
                    </h4>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        z.active
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-zinc-500/15 text-zinc-400'
                      }`}
                    >
                      {z.active ? 'Activa' : 'Oculta'}
                    </span>
                  </div>
                  {z.description && (
                    <p className="text-xs text-zinc-500 mt-0.5">{z.description}</p>
                  )}
                  <p className="font-mono text-lg font-extrabold text-[#b38f2d] dark:text-[#d4af37] mt-1.5">
                    Tarifa Cadete: ${Number(z.price).toLocaleString('es-AR')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditZoneModal(z)}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-[#d4af37] min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteShippingZoneAction(z.id);
                      })
                    }
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-rose-500 hover:bg-rose-500/10 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? `Editar: ${editingProduct.name}` : 'Nuevo Producto de Barbería'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="Ej: Cera Modeladora Efecto Mate 100g"
              className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                Categoría *
              </label>
              <select
                value={prodCat}
                onChange={(e) => setProdCat(e.target.value)}
                className="w-full px-3 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 min-h-[44px]"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                Precio (ARS) *
              </label>
              <input
                type="number"
                inputMode="decimal"
                required
                min="0"
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                placeholder="12000"
                className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                Stock (Unidades) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                min="0"
                value={prodStock}
                onChange={(e) => setProdStock(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
              Descripción y Modo de Uso
            </label>
            <textarea
              rows={2}
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
              placeholder="Fijación alta sin residuos, ideal para degradados y texturas..."
              className="w-full p-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Foto del Producto (Subir desde el celular o URL)
            </label>
            <div className="flex items-center gap-3">
              <img
                src={prodImg || '/images/interior-sillas.webp'}
                alt="Preview"
                className="w-16 h-16 rounded-2xl object-cover border border-[#d4af37]/40 shrink-0"
              />
              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Foto / Cámara (Optimiza a WebP)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  value={prodImg}
                  onChange={(e) => setProdImg(e.target.value)}
                  placeholder="/images/interior-sillas.webp"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={prodActive}
                onChange={(e) => setProdActive(e.target.checked)}
                className="w-4 h-4 accent-[#d4af37]"
              />
              <span>Visible en Tienda Pública</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={prodFeatured}
                onChange={(e) => setProdFeatured(e.target.checked)}
                className="w-4 h-4 accent-[#d4af37]"
              />
              <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Destacar en Portada</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-zinc-300 dark:border-zinc-700 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d4af37] text-zinc-950 min-h-[44px] flex items-center gap-2 cursor-pointer"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Guardar Producto</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL VENTA PRESENCIAL EN LOCAL */}
      <Modal
        isOpen={Boolean(saleModalProduct)}
        onClose={() => setSaleModalProduct(null)}
        title={`Venta en Local: ${saleModalProduct?.name || ''}`}
      >
        <form onSubmit={handleConfirmDirectSale} className="space-y-4 text-left">
          <p className="text-xs text-zinc-500">
            Descuenta unidades del inventario e ingresa el monto automáticamente en <strong>Caja & Finanzas</strong> bajo la categoría <em>Venta de Productos</em>.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max={saleModalProduct?.stock || 1}
                required
                value={saleQty}
                onChange={(e) => setSaleQty(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
                Medio de Cobro
              </label>
              <select
                value={saleMethod}
                onChange={(e) =>
                  setSaleMethod(e.target.value as 'CASH' | 'TRANSFER' | 'MERCADOPAGO')
                }
                className="w-full px-3 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[44px]"
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="MERCADOPAGO">Mercado Pago</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
              Cliente (Opcional)
            </label>
            <input
              type="text"
              value={saleCustomer}
              onChange={(e) => setSaleCustomer(e.target.value)}
              placeholder="Ej: Cliente en sillón"
              className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[44px]"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-between">
            <span className="text-xs font-bold">Total a ingresar en Caja:</span>
            <span className="font-mono text-lg font-extrabold text-[#b38f2d] dark:text-[#d4af37]">
              $
              {(
                Number(saleModalProduct?.price || 0) * Math.max(1, Number(saleQty) || 1)
              ).toLocaleString('es-AR')}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSaleModalProduct(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-zinc-300 dark:border-zinc-700 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-zinc-950 min-h-[44px] cursor-pointer"
            >
              Confirmar Venta
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL ZONA DE CADETE */}
      <Modal
        isOpen={zoneModalOpen}
        onClose={() => setZoneModalOpen(false)}
        title={editingZone ? 'Editar Zona de Cadete' : 'Nueva Zona de Envío por Cadete'}
      >
        <form onSubmit={handleSaveZone} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
              Zona / Localidad *
            </label>
            <input
              type="text"
              required
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="Ej: Valle Viejo / Sumalao / Catamarca Capital"
              className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
              Costo del Cadete (ARS) *
            </label>
            <input
              type="number"
              inputMode="decimal"
              required
              min="0"
              value={zonePrice}
              onChange={(e) => setZonePrice(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
              Detalle / Tiempo estimado
            </label>
            <input
              type="text"
              value={zoneDesc}
              onChange={(e) => setZoneDesc(e.target.value)}
              placeholder="Ej: Envío en el día con cadete de confianza"
              className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[44px]"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={zoneActive}
              onChange={(e) => setZoneActive(e.target.checked)}
              className="w-4 h-4 accent-[#d4af37]"
            />
            <span>Zona habilitada para envíos</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setZoneModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-zinc-300 dark:border-zinc-700 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d4af37] text-zinc-950 min-h-[44px] cursor-pointer"
            >
              Guardar Tarifa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

