import { formatDateTime, formatMoney } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderItemsCard } from './OrderItemsCard';
import { useOrderDetail } from '../api/useOrderDetail';

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const CAPTION = 'text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5';

/**
 * Tabloda yerinde açılan sipariş detayı.
 * Detay ancak açıldığında sorgulanır — liste sorgusu ağırlaşmasın diye ayrı.
 */
export function OrderExpandedDetail({ orderId, orgId }: { orderId: string; orgId: string }) {
  const { data: detail, isPending, isError } = useOrderDetail(orderId, orgId);

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-6 pl-2">
        <Spinner />
        <span className="font-medium">Sipariş detayları yükleniyor...</span>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <p role="alert" className="text-xs font-bold text-red-600 py-6 pl-2">
        Sipariş detayları yüklenemedi.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
      {/* Sol sütun: müşteri bilgileri ve sevkiyatlar */}
      <div className="space-y-6">
        <div className={`${CARD} space-y-4`}>
          <div>
            <h4 className={`${CAPTION} mb-3`}>
              <span className="text-slate-400">•</span> MÜŞTERİ & ALICI BİLGİLERİ
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium mb-0.5">Son Kullanıcı (Müşteri)</p>
                <p className="font-bold text-slate-800">{detail.customerName || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium mb-0.5">Müşteri Telefon</p>
                <p className="font-mono text-slate-700">{detail.customerPhone || '—'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className={`${CAPTION} mb-2`}>
              <span className="text-slate-400">•</span> TESLİMAT ADRESİ
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium flex items-center gap-1.5">
              <span className="text-slate-400">🏢</span> {detail.customerAddress || '—'}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className={`${CAPTION} mb-2`}>
              <span className="text-slate-400">•</span> SİPARİŞ AÇIKLAMASI
            </h4>
            <div className="rounded-xl bg-amber-50/50 border border-amber-200/60 p-3.5 text-xs text-amber-900 font-medium italic">
              {detail.note || '—'}
            </div>
          </div>
        </div>

        {detail.shipments.length > 0 && (
          <div className={`${CARD} space-y-3`}>
            <h4 className={`${CAPTION} border-b border-slate-100 pb-3`}>
              <span className="text-slate-400">•</span> BU SİPARİŞTEN YAPILAN SEVKİYATLAR
            </h4>
            <div className="space-y-2.5">
              {detail.shipments.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center justify-between sm:block min-w-0">
                    <span className="font-bold text-xs text-slate-800">{s.shipmentNo}</span>
                    <span className="sm:hidden font-extrabold text-xs text-slate-900">{formatMoney(s.totalAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="font-mono text-[10px] text-slate-400">{formatDateTime(s.createdAt)}</span>
                    <span className="hidden sm:inline font-extrabold text-xs text-slate-900">{formatMoney(s.totalAmount)}</span>
                    <OrderStatusBadge status={s.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sağ sütun: kalemler ve tarihçe */}
      <div className="space-y-6">
        <OrderItemsCard
          items={detail.items}
          totalAmount={detail.originalAmount}
          returnTotalAmount={detail.returnTotalAmount}
          isCancelled={detail.status === 'cancelled'}
        />

        <div className={`${CARD} space-y-4`}>
          <h4 className={`${CAPTION} border-b border-slate-100 pb-3`}>
            <span className="text-slate-400">•</span> SİPARİŞ TARİHÇESİ (TİMELİNE)
          </h4>

          {detail.history.length === 0 ? (
            <p className="text-xs italic text-slate-400 py-2">Tarihçe kaydı bulunmuyor.</p>
          ) : (
            <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {detail.history.map((h, idx) => {
                const isReturn = h.toStatus === 'returned' || h.note?.includes('İade');
                const badgeStatus = isReturn ? 'returned' : h.toStatus;
                return (
                  <div key={h.id || idx} className="relative text-xs min-w-0">
                    <div
                      className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ${
                        isReturn
                          ? 'bg-red-500 ring-red-400'
                          : h.toStatus === 'delivered'
                            ? 'bg-emerald-500 ring-emerald-400'
                            : 'bg-slate-300 ring-slate-400'
                      }`}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-slate-500 font-medium">
                        {formatDateTime(h.createdAt)}
                      </span>
                      <OrderStatusBadge status={badgeStatus} />
                      {h.shipmentBadge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-100 text-brand-700 border border-brand-200">
                          {h.shipmentBadge}
                        </span>
                      )}
                    </div>
                    {h.note && (
                      <p className="mt-1.5 text-slate-700 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed font-normal break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
                        {h.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
