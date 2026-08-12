import { useState } from 'react';
import {
  OrderTable,
  ShipmentDialog,
  isShipmentStep,
  useAdvanceOrderStatus,
  useCancelOrder,
  useOrders,
  useOrderDetail,
  useOrderStats,
  useShipOrder,
  ORDER_STATUS_META,
  type OrderStatus,
} from '@/features/orders';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { ORG_KIND } from '@/constants';

/** Sipariş listesi — her iki taraf için ortak. YALNIZ KOMPOZİSYON (A20). */
export default function OrdersPage() {
  const { data: user } = useAuthSession();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);

  // Durum güncelleme onay modalı state'i
  const [statusModal, setStatusModal] = useState<{
    orderId: string;
    targetStatus: OrderStatus;
    currentStatus: OrderStatus;
  } | null>(null);

  const [statusNote, setStatusNote] = useState('');

  const orgId = user?.org?.id ?? '';
  const list = useOrders(orgId, filter);
  const stats = useOrderStats(orgId);

  const advance = useAdvanceOrderStatus();
  const ship = useShipOrder();
  const cancel = useCancelOrder();

  if (!user?.org) return null;
  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;

  // Keyset sayfalarını geleneksel sayfalara bölme
  const loadedPagesCount = list.data?.pages.length ?? 0;
  const currentPageOrders = list.data?.pages[page - 1] ?? [];

  // Arama filtresi
  const term = search.trim().toLowerCase();
  const filteredOrders = currentPageOrders.filter((o) => {
    if (!term) return true;
    return (
      o.orderNo.toLowerCase().includes(term) ||
      o.counterpartyName.toLowerCase().includes(term) ||
      (o.customerName && o.customerName.toLowerCase().includes(term))
    );
  });

  // Durum Güncelleme Buton Aksiyonu (Onay modalını tetikler)
  const handleInitiateUpdateStatus = (orderId: string, toStatus: OrderStatus) => {
    const order = currentPageOrders.find((o) => o.id === orderId);
    if (!order) return;

    if (toStatus === 'cancelled') {
      setStatusModal({
        orderId,
        targetStatus: 'cancelled',
        currentStatus: order.status,
      });
      setStatusNote('');
      return;
    }

    if (isShipmentStep(toStatus)) {
      setShippingOrderId(orderId);
      return;
    }

    setStatusModal({
      orderId,
      targetStatus: toStatus,
      currentStatus: order.status,
    });
    setStatusNote('');
  };

  // Onay modalındaki "Kaydet" tetiklendiğinde
  const handleConfirmUpdateStatus = () => {
    if (!statusModal) return;

    const { orderId, targetStatus } = statusModal;

    if (targetStatus === 'cancelled') {
      cancel.mutate(
        { orderId, reason: statusNote.trim() || undefined },
        { onSuccess: () => setStatusModal(null) }
      );
      return;
    }

    advance.mutate(
      { orderId, status: targetStatus, note: statusNote.trim() || undefined },
      { onSuccess: () => setStatusModal(null) }
    );
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < loadedPagesCount) {
      setPage(page + 1);
    } else if (list.hasNextPage) {
      list.fetchNextPage().then(() => {
        setPage(page + 1);
      });
    }
  };

  const hasNext = page < loadedPagesCount || list.hasNextPage;

  // Sevkiyat modalı için seçili sipariş details verisini API'den çek
  const shippingOrderQuery = useOrderDetail(shippingOrderId, orgId);
  const shippingOrder = shippingOrderQuery.data;

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

      {/* Sipariş Özet Kartları (Stats) */}
      {!stats.isPending && stats.data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {/* TÜM SİPARİŞLER */}
          <button
            onClick={() => { setFilter('all'); setPage(1); }}
            className={`flex flex-col items-start justify-between rounded-2xl border bg-white p-5 text-left transition-all ${
              filter === 'all'
                ? 'border-slate-300 ring-2 ring-slate-900/5 shadow-md'
                : 'border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tüm Siparişler</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </span>
            </div>
            <span className="mt-3 text-3xl font-black text-slate-900">{stats.data.all}</span>
          </button>

          {/* BEKLEYEN */}
          <button
            onClick={() => { setFilter('pending'); setPage(1); }}
            className={`flex flex-col items-start justify-between rounded-2xl border bg-white p-5 text-left transition-all ${
              filter === 'pending'
                ? 'border-amber-300 ring-2 ring-amber-500/10 shadow-md'
                : 'border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Bekleyen</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-505">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <span className="mt-3 text-3xl font-black text-amber-700">{stats.data.pending}</span>
          </button>

          {/* ÜRETİLİYOR */}
          <button
            onClick={() => { setFilter('in_production'); setPage(1); }}
            className={`flex flex-col items-start justify-between rounded-2xl border bg-white p-5 text-left transition-all ${
              filter === 'in_production'
                ? 'border-indigo-300 ring-2 ring-indigo-500/10 shadow-md'
                : 'border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Üretiliyor</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-50">
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a3 3 0 012.122.879L13.5 5.379a3 3 0 002.122.879H19.5a3 3 0 013 3v.888a3 3 0 01-3 3h-15a3 3 0 01-3-3z" />
                </svg>
              </span>
            </div>
            <span className="mt-3 text-3xl font-black text-indigo-700">{stats.data.in_production}</span>
          </button>

          {/* SEVKİYATTA */}
          <button
            onClick={() => { setFilter('shipped'); setPage(1); }}
            className={`flex flex-col items-start justify-between rounded-2xl border bg-white p-5 text-left transition-all ${
              filter === 'shipped'
                ? 'border-cyan-300 ring-2 ring-cyan-500/10 shadow-md'
                : 'border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600">Sevkiyatta</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-cyan-505">
                <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </span>
            </div>
            <span className="mt-3 text-3xl font-black text-cyan-700">{stats.data.shipped}</span>
          </button>

          {/* TESLİM EDİLDİ */}
          <button
            onClick={() => { setFilter('delivered'); setPage(1); }}
            className={`flex flex-col items-start justify-between rounded-2xl border bg-white p-5 text-left transition-all ${
              filter === 'delivered'
                ? 'border-emerald-300 ring-2 ring-emerald-500/10 shadow-md'
                : 'border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Teslim Edildi</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-505">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <span className="mt-3 text-3xl font-black text-emerald-700">{stats.data.delivered}</span>
          </button>

          {/* İPTAL EDİLDİ */}
          <button
            onClick={() => { setFilter('cancelled'); setPage(1); }}
            className={`flex flex-col items-start justify-between rounded-2xl border bg-white p-5 text-left transition-all ${
              filter === 'cancelled'
                ? 'border-red-300 ring-2 ring-red-500/10 shadow-md'
                : 'border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-600">İptal Edildi</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-505">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <span className="mt-3 text-3xl font-black text-red-700">{stats.data.cancelled}</span>
          </button>
        </div>
      )}

      {/* Arama Çubuğu */}
      <div className="w-full">
        <label className="relative block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            className="input pl-11"
            placeholder="Sipariş No, Müşteri Adı veya Ürün Ara..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

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
            onSelect={() => {}} // Artık inline açıldığı için boş geçilebilir
            onUpdateStatus={handleInitiateUpdateStatus}
            updatingOrderId={advance.isPending || cancel.isPending ? statusModal?.orderId ?? null : null}
          />

          {/* Sayfalama (Pagination) */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              type="button"
              disabled={page === 1}
              onClick={handlePrevPage}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              ← Önceki
            </button>
            <span className="text-xs font-bold text-slate-500">
              Sayfa {page}
            </span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={handleNextPage}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Sonraki →
            </button>
          </div>
        </>
      )}

      {/* Durum Güncelleme Açıklama/Onay Modalı */}
      {statusModal && (
        <Modal
          label="Durum Güncelleme ve Not"
          panelClassName="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-0 shadow-2xl border border-slate-100 overflow-hidden"
          onClose={() => setStatusModal(null)}
          closeDisabled={advance.isPending || cancel.isPending}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <h3 className="text-base font-bold text-slate-900">Durum Güncelleme ve Not</h3>
            <button
              onClick={() => setStatusModal(null)}
              disabled={advance.isPending || cancel.isPending}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg font-medium cursor-pointer"
            >
              &times;
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Status transition visual */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex-1 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Eski Durum</span>
                <span className="font-semibold text-sm text-slate-700">
                  {ORDER_STATUS_META[statusModal.currentStatus].label}
                </span>
              </div>
              <div className="flex-shrink-0 text-slate-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="flex-1 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Yeni Durum</span>
                <span className="font-semibold text-sm text-indigo-600">
                  {ORDER_STATUS_META[statusModal.targetStatus].label}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Açıklama / Not <span className="font-normal normal-case text-slate-400">(Opsiyonel)</span>
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-all outline-none min-h-[100px]"
                rows={4}
                placeholder="Durum değişikliği notu..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50/60 border-t border-slate-100">
            <button
              onClick={() => setStatusModal(null)}
              disabled={advance.isPending || cancel.isPending}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              İptal
            </button>
            <Button
              loading={advance.isPending || cancel.isPending}
              onClick={handleConfirmUpdateStatus}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Onayla ve Güncelle
            </Button>
          </div>
        </Modal>
      )}

      {/* Sevkiyat Modalı Yükleniyor */}
      {shippingOrderId && shippingOrderQuery.isPending && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center">
          <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-3">
            <Spinner />
            <span className="text-sm font-medium text-slate-600">Sipariş detayları yükleniyor...</span>
          </div>
        </div>
      )}

      {/* Sevkiyat Modalı */}
      {shippingOrderId && shippingOrder && (
        <ShipmentDialog
          order={shippingOrder}
          pending={ship.isPending}
          errorMessage={
            ship.isError ? 'Sevkiyat kaydedilemedi. Miktarları kontrol edin.' : undefined
          }
          onClose={() => setShippingOrderId(null)}
          onShip={(items, note) =>
            ship.mutate(
              { orderId: shippingOrderId, items, note },
              { onSuccess: () => setShippingOrderId(null) }
            )
          }
        />
      )}
    </div>
  );
}
