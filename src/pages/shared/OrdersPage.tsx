import { useState } from 'react';
import {
  OrderDetailPanel,
  OrderTable,
  ShipmentDialog,
  isShipmentStep,
  useAdvanceOrderStatus,
  useCancelOrder,
  useOrderDetail,
  useOrders,
  useShipOrder,
  type OrderStatus,
} from '@/features/orders';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ORG_KIND } from '@/constants';

const FILTERS: { id: OrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'pending', label: 'Onay bekleyen' },
  { id: 'in_production', label: 'Üretimde' },
  { id: 'shipped', label: 'Sevk edilen' },
  { id: 'delivered', label: 'Teslim edilen' },
];

/** Sipariş listesi — her iki taraf için ortak. YALNIZ KOMPOZİSYON (A20). */
export default function OrdersPage() {
  const { data: user } = useAuthSession();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shipping, setShipping] = useState(false);

  const orgId = user?.org?.id ?? '';
  const list = useOrders(orgId, filter);
  const detail = useOrderDetail(selectedId, orgId);
  const advance = useAdvanceOrderStatus();
  const ship = useShipOrder();
  const cancel = useCancelOrder();

  const close = () => {
    setSelectedId(null);
    setShipping(false);
  };

  if (!user?.org) return null;
  const orders = list.data?.pages.flat() ?? [];
  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {isManufacturer ? 'Gelen Siparişler' : 'Siparişlerim'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isManufacturer
            ? 'Müşterilerinizden gelen siparişleri onaylayın ve üretim akışını ilerletin.'
            : 'Verdiğiniz siparişlerin durumunu takip edin.'}
        </p>
      </div>

      <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <OrderTable orders={orders} onSelect={(o) => setSelectedId(o.id)} />
      )}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            loading={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            Daha fazla yükle
          </Button>
        </div>
      )}

      {detail.data && !shipping && (
        <OrderDetailPanel
          order={detail.data}
          myKind={user.org.kind}
          pending={advance.isPending || cancel.isPending}
          onClose={close}
          onAdvance={(to) => {
            // Sevkiyat miktar seçtirir (kısmi sevkiyat çocuk sipariş üretir),
            // bu yüzden doğrudan durum değiştirmek yerine ayrı ekran açılır.
            if (isShipmentStep(to)) {
              setShipping(true);
              return;
            }
            advance.mutate({ orderId: detail.data.id, status: to }, { onSuccess: close });
          }}
          onCancel={() => cancel.mutate({ orderId: detail.data.id }, { onSuccess: close })}
        />
      )}

      {detail.data && shipping && (
        <ShipmentDialog
          order={detail.data}
          pending={ship.isPending}
          errorMessage={
            ship.isError ? 'Sevkiyat kaydedilemedi. Miktarları kontrol edin.' : undefined
          }
          onClose={() => setShipping(false)}
          onShip={(items) => ship.mutate({ orderId: detail.data.id, items }, { onSuccess: close })}
        />
      )}
    </div>
  );
}
