'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  products,
  shippingZones,
  productOrders,
  cashTransactions,
} from '@/db/schema';
import { ensureExtendedSchema } from '@/db/ensureSchema';
import { eq, desc, asc, sql, inArray } from 'drizzle-orm';
import { getSession } from '@/utils/auth';
import { createProductOrderPreference } from '@/utils/mercadopago';
import { calculateOrderAccounting } from '@/utils/dateHelpers';
import sharp from 'sharp';

/**
 * Procesa una imagen en base64 (si el usuario subió un archivo desde su celular/PC)
 * y la comprime a formato WebP ligero (< 60KB) como data URI para guardarla sin depender de S3 externo.
 */
export async function optimizeImageToWebpDataUri(inputUrlOrDataUri?: string): Promise<string> {
  if (!inputUrlOrDataUri) return '/images/interior-sillas.webp';
  const trimmed = inputUrlOrDataUri.trim();
  if (!trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  try {
    const base64Part = trimmed.split(',')[1];
    if (!base64Part) return trimmed;
    const inputBuffer = Buffer.from(base64Part, 'base64');
    const outputBuffer = await sharp(inputBuffer)
      .resize({ width: 720, height: 720, fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return `data:image/webp;base64,${outputBuffer.toString('base64')}`;
  } catch (err) {
    console.warn('No se pudo comprimir imagen con sharp, usando original:', err);
    return trimmed;
  }
}

export async function getProductsAction(onlyActive = false) {
  await ensureExtendedSchema();
  const list = await db
    .select()
    .from(products)
    .orderBy(desc(products.featured), asc(products.name));

  return onlyActive ? list.filter((p) => p.active) : list;
}

export async function saveProductAction(input: {
  id?: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
  active?: boolean;
  featured?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'No autorizado.' };
    }

    await ensureExtendedSchema();

    if (!input.name.trim()) {
      return { success: false, error: 'El nombre del producto es obligatorio.' };
    }

    const optimizedImage = await optimizeImageToWebpDataUri(input.imageUrl);
    const safePrice = Math.max(0, Number(input.price) || 0).toFixed(2);
    const safeStock = Math.max(0, Math.floor(Number(input.stock) || 0));

    if (input.id) {
      await db
        .update(products)
        .set({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          category: input.category || 'HAIR',
          price: safePrice,
          stock: safeStock,
          imageUrl: optimizedImage,
          active: input.active ?? true,
          featured: input.featured ?? false,
          updatedAt: new Date(),
        })
        .where(eq(products.id, input.id));
    } else {
      await db.insert(products).values({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        category: input.category || 'HAIR',
        price: safePrice,
        stock: safeStock,
        imageUrl: optimizedImage,
        active: input.active ?? true,
        featured: input.featured ?? false,
      });
    }

    revalidatePath('/dashboard/inventario');
    revalidatePath('/dashboard/servicios');
    revalidatePath('/tienda');
    revalidatePath('/reservar');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error al guardar producto:', error);
    return { success: false, error: 'No se pudo guardar el producto.' };
  }
}

export async function deleteProductAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'No autorizado.' };

    await ensureExtendedSchema();
    await db.delete(products).where(eq(products.id, id));

    revalidatePath('/dashboard/inventario');
    revalidatePath('/tienda');
    revalidatePath('/reservar');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return { success: false, error: 'No se pudo eliminar el producto.' };
  }
}

/**
 * Registra una venta rápida presencial en el local (Efectivo, Transferencia o MP),
 * descontando stock automáticamente e impactando en Caja & Finanzas.
 */
export async function registerDirectProductSaleAction(input: {
  productId: string;
  quantity: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'MERCADOPAGO';
  customerName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'No autorizado.' };

    await ensureExtendedSchema();

    const rows = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    const product = rows[0];
    if (!product) {
      return { success: false, error: 'Producto no encontrado.' };
    }

    const qty = Math.max(1, Math.floor(Number(input.quantity) || 1));
    if (product.stock < qty) {
      return {
        success: false,
        error: `Stock insuficiente. Solo quedan ${product.stock} unidades de ${product.name}.`,
      };
    }

    const totalAmount = (Number(product.price) * qty).toFixed(2);

    // 1. Descontar stock
    await db
      .update(products)
      .set({
        stock: sql`GREATEST(0, ${products.stock} - ${qty})`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id));

    // 2. Registrar ingreso en Caja
    await db.insert(cashTransactions).values({
      type: 'INCOME',
      category: 'PRODUCT_SALE',
      amount: totalAmount,
      paymentMethod: input.paymentMethod,
      description: `Venta en local: ${qty}x ${product.name}${
        input.customerName?.trim() ? ` - Cliente: ${input.customerName.trim()}` : ''
      }`,
      userId: session.id,
      transactionDate: new Date(),
    });

    revalidatePath('/dashboard/inventario');
    revalidatePath('/dashboard/caja');
    revalidatePath('/tienda');
    return { success: true };
  } catch (error) {
    console.error('Error al registrar venta directa de producto:', error);
    return { success: false, error: 'Error al registrar la venta.' };
  }
}

export async function getShippingZonesAction(onlyActive = false) {
  await ensureExtendedSchema();
  const list = await db
    .select()
    .from(shippingZones)
    .orderBy(asc(shippingZones.displayOrder), asc(shippingZones.name));

  return onlyActive ? list.filter((z) => z.active) : list;
}

export async function saveShippingZoneAction(input: {
  id?: string;
  name: string;
  description?: string;
  price: number;
  active?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'No autorizado.' };

    await ensureExtendedSchema();

    if (!input.name.trim()) {
      return { success: false, error: 'El nombre de la zona es obligatorio.' };
    }

    const safePrice = Math.max(0, Number(input.price) || 0).toFixed(2);

    if (input.id) {
      await db
        .update(shippingZones)
        .set({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          price: safePrice,
          active: input.active ?? true,
          updatedAt: new Date(),
        })
        .where(eq(shippingZones.id, input.id));
    } else {
      await db.insert(shippingZones).values({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        price: safePrice,
        active: input.active ?? true,
      });
    }

    revalidatePath('/dashboard/inventario');
    revalidatePath('/tienda');
    return { success: true };
  } catch (error) {
    console.error('Error guardando zona de envío:', error);
    return { success: false, error: 'No se pudo guardar la zona de envío.' };
  }
}

export async function deleteShippingZoneAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'No autorizado.' };

    await ensureExtendedSchema();
    await db.delete(shippingZones).where(eq(shippingZones.id, id));

    revalidatePath('/dashboard/inventario');
    revalidatePath('/tienda');
    return { success: true };
  } catch (error) {
    console.error('Error eliminando zona de envío:', error);
    return { success: false, error: 'No se pudo eliminar la zona.' };
  }
}

export async function getProductOrdersAction() {
  await ensureExtendedSchema();
  return db.select().from(productOrders).orderBy(desc(productOrders.createdAt));
}

export async function updateProductOrderStatusAction(
  orderId: string,
  status: 'PAID' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED'
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'No autorizado.' };

    await ensureExtendedSchema();
    await db
      .update(productOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(productOrders.id, orderId));

    revalidatePath('/dashboard/inventario');
    return { success: true };
  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    return { success: false, error: 'No se pudo actualizar el pedido.' };
  }
}

/**
 * Crea una orden de compra desde la Tienda Pública (/tienda) con opción de:
 * - PICKUP: Retiro gratis en Diogo Barber Shop ($0)
 * - COURIER: Envío por Cadete (exclusivo Catamarca Capital, Valle Viejo, Sumalao, etc.)
 * Cobra el total (Productos + Cadete) en Mercado Pago, pero al acreditarse
 * solo impacta el valor de los productos en la Caja de Diogo.
 */
export async function createStoreOrderCheckoutAction(input: {
  customerName: string;
  customerPhone: string;
  deliveryType: 'PICKUP' | 'COURIER';
  shippingZoneId?: string;
  shippingAddress?: string;
  shippingNotes?: string;
  cartItems: Array<{ productId: string; quantity: number }>;
}): Promise<{
  success: boolean;
  initPoint?: string;
  orderId?: string;
  error?: string;
}> {
  try {
    await ensureExtendedSchema();

    if (!input.customerName.trim() || !input.customerPhone.trim()) {
      return {
        success: false,
        error: 'Por favor ingresá tu nombre completo y tu número de WhatsApp.',
      };
    }

    if (!input.cartItems || input.cartItems.length === 0) {
      return { success: false, error: 'Tu carrito de productos está vacío.' };
    }

    const productIds = input.cartItems.map((i) => i.productId);
    const dbProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    const verifiedItems: Array<{
      productId: string;
      name: string;
      unitPrice: number;
      quantity: number;
    }> = [];

    for (const cartItem of input.cartItems) {
      const prod = dbProducts.find((p) => p.id === cartItem.productId && p.active);
      if (!prod) {
        return {
          success: false,
          error: 'Uno de los productos seleccionados ya no está disponible.',
        };
      }
      const qty = Math.max(1, Math.floor(Number(cartItem.quantity) || 1));
      if (prod.stock < qty) {
        return {
          success: false,
          error: `Stock insuficiente para "${prod.name}" (disponibles: ${prod.stock}).`,
        };
      }
      verifiedItems.push({
        productId: prod.id,
        name: prod.name,
        unitPrice: Number(prod.price),
        quantity: qty,
      });
    }

    let shippingCost = 0;
    let shippingZoneName: string | undefined = undefined;

    if (input.deliveryType === 'COURIER') {
      if (!input.shippingZoneId) {
        return {
          success: false,
          error:
            'Seleccioná tu zona de envío (Catamarca Capital, Valle Viejo, Sumalao, etc.).',
        };
      }
      if (!input.shippingAddress?.trim()) {
        return {
          success: false,
          error: 'Ingresá tu dirección exacta y barrio para que el cadete pueda entregarte el pedido.',
        };
      }

      const zoneRows = await db
        .select()
        .from(shippingZones)
        .where(eq(shippingZones.id, input.shippingZoneId))
        .limit(1);

      const zone = zoneRows[0];
      if (!zone || !zone.active) {
        return { success: false, error: 'La zona de envío seleccionada no es válida.' };
      }

      shippingCost = Number(zone.price);
      shippingZoneName = zone.name;
    }

    const accounting = calculateOrderAccounting(verifiedItems, shippingCost);

    const [createdOrder] = await db
      .insert(productOrders)
      .values({
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        deliveryType: input.deliveryType,
        shippingZoneId: input.deliveryType === 'COURIER' ? input.shippingZoneId : null,
        shippingZoneName: shippingZoneName || null,
        shippingAddress: input.shippingAddress?.trim() || null,
        shippingNotes: input.shippingNotes?.trim() || null,
        itemsJson: JSON.stringify(verifiedItems),
        productsSubtotal: accounting.productsSubtotal.toFixed(2),
        shippingCost: accounting.shippingCost.toFixed(2),
        totalPaid: accounting.mercadoPagoTotal.toFixed(2),
        status: 'PENDING_PAYMENT',
        paymentMethod: 'MERCADOPAGO',
        paymentStatus: 'PENDING',
      })
      .returning();

    try {
      const mpPref = await createProductOrderPreference({
        orderId: createdOrder.id,
        customerName: createdOrder.customerName,
        customerPhone: createdOrder.customerPhone,
        items: verifiedItems.map((i) => ({
          id: i.productId,
          title: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        shippingZoneName,
        shippingCost: accounting.shippingCost,
      });

      if (mpPref.preferenceId) {
        await db
          .update(productOrders)
          .set({ mpPreferenceId: mpPref.preferenceId })
          .where(eq(productOrders.id, createdOrder.id));
      }

      return {
        success: true,
        orderId: createdOrder.id,
        initPoint:
          mpPref.initPoint ||
          `/confirmacion?orderId=${createdOrder.id}&status=approved`,
      };
    } catch (mpError) {
      console.error('Error conectando con Mercado Pago en orden de tienda:', mpError);
      return {
        success: false,
        error: 'No se pudo iniciar el pago con Mercado Pago. Intentá nuevamente.',
      };
    }
  } catch (error) {
    console.error('Error en createStoreOrderCheckoutAction:', error);
    return {
      success: false,
      error: 'Ocurrió un error al procesar tu pedido.',
    };
  }
}

