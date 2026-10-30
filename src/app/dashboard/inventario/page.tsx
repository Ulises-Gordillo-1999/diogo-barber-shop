import { AppLayout } from '@/components/layout/AppLayout';
import { InventoryManager } from '@/components/inventario/InventoryManager';
import {
  getProductsAction,
  getShippingZonesAction,
  getProductOrdersAction,
} from '@/app/actions/productActions';
import { syncPendingAppointments } from '@/utils/mercadopago';

export const dynamic = 'force-dynamic';

export default async function InventarioDashboardPage() {
  await syncPendingAppointments();

  const [productsList, zonesList, ordersList] = await Promise.all([
    getProductsAction(false),
    getShippingZonesAction(false),
    getProductOrdersAction(),
  ]);

  return (
    <AppLayout>
      <InventoryManager
        initialProducts={productsList}
        initialZones={zonesList}
        initialOrders={ordersList}
      />
    </AppLayout>
  );
}

