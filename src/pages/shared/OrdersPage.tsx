import { useState } from 'react';
import {
  OrderStatCards,
  OrderTable,
  ShipmentDialog,
  StatusUpdateDialog,
  useOrderDetail,
  useOrderStats,
  useOrderStatusFlow,
  useOrders,
  type OrderFilter,
} from '@/features/orders';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pager } from '@/components/ui/Pager';
import { ORG_KIND } from '@/constants';

/** Sipariş listesi — her iki taraf için ortak. YALNIZ KOMPOZİSYON (A20). */
export default function OrdersPage() {
  const { data: user } = useAuthSession();
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // TÜM hook'lar erken return'ün ÜSTÜNDE: sevkiyat detayı sorgusu eskiden
  // aşağıda çağrılıyordu, org yokken hiç çalışmıyordu — hook sırası ihlali.
  const orgId = user?.org?.id ?? '';
  const list = useOrders(orgId, filter);
  const stats = useOrderStats(orgId);
  const flow = useOrderStatusFlow();
  const shippingQuery = useOrderDetail(flow.shippingOrderId, orgId);

  if (!user?.org) return null;
  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;

  // Keyset sayfaları geleneksel sayfalara bölünür (A17 — OFFSET yok).
  const loadedPagesCount = list.data?.pages.length ?? 0;
  const currentPageOrders = list.data?.pages[page - 1] ?? [];

  const term = search.trim().toLowerCase();
  const filteredOrders = currentPageOrders.filter(
    (o) =>
      !term ||
      o.orderNo.toLowerCase().includes(term) ||
      o.counterpartyName.toLowerCase().includes(term) ||
      (o.customerName ?? '').toLowerCase().includes(term),
  );

  const goNextPage = () => {
    if (page < loadedPagesCount) {
      setPage(page + 1);
      return;
    }
    if (list.hasNextPage) void list.fetchNextPage().then(() => setPage(page + 1));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Sipariş Yönetimi</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isManufacturer
            ? 'Müşterilerinizden gelen siparişleri onaylayın ve üretim akışını ilerletin.'
            : 'Verdiğiniz siparişlerin durumunu takip edin.'}
        </p>
      </div>

      {stats.data && (
        <OrderStatCards
          stats={stats.data}
          active={filter}
          onSelect={(f) => { setFilter(f); setPage(1); }}
        />
      )}

      <SearchInput
        value={search}
        placeholder="Sipariş No, Müşteri Adı veya Ürün Ara..."
        onChange={(v) => { setSearch(v); setPage(1); }}
      />

      {list.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : list.isError ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Siparişler yüklenemedi.
        </p>
      ) : (
        <>
          <OrderTable
            orders={filteredOrders}
            myKind={user.org.kind}
            myOrgId={user.org.id}
            onUpdateStatus={(orderId, status) =>
              flow.initiate(currentPageOrders.find((o) => o.id === orderId), status)
            }
            updatingOrderId={flow.pending ? flow.target?.orderId ?? null : null}
          />

          <Pager
            page={page}
            hasPrev={page > 1}
            hasNext={page < loadedPagesCount || list.hasNextPage}
            onPrev={() => setPage(Math.max(1, page - 1))}
            onNext={goNextPage}
          />
        </>
      )}

      {flow.target && (
        <StatusUpdateDialog
          currentStatus={flow.target.currentStatus}
          targetStatus={flow.target.targetStatus}
          note={flow.note}
          pending={flow.pending}
          onNoteChange={flow.setNote}
          onClose={flow.close}
          onConfirm={flow.confirm}
        />
      )}

      {flow.shippingOrderId && shippingQuery.isPending && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center">
          <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-3">
            <Spinner />
            <span className="text-sm font-medium text-slate-600">Sipariş detayları yükleniyor...</span>
          </div>
        </div>
      )}

      {flow.shippingOrderId && shippingQuery.data && (
        <ShipmentDialog
          order={shippingQuery.data}
          pending={flow.ship.isPending}
          errorMessage={
            flow.ship.isError ? 'Sevkiyat kaydedilemedi. Miktarları kontrol edin.' : undefined
          }
          onClose={() => flow.setShippingOrderId(null)}
          onShip={flow.shipOrder}
        />
      )}
    </div>
  );
}
