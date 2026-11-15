import { formatDateTime } from '@/lib/format';
import { getEffectiveStatus, mergedHistory, stepIndexOf, type TrackedOrder } from '../domain/tracking';
import { displayShipments, trackSummary } from '../domain/trackingTotals';
import { TrackCustomerDeliveries } from './TrackCustomerDeliveries';
import { TrackHistory } from './TrackHistory';
import { TRACK_CARD as CARD, TrackLines } from './TrackLines';
import { TrackShipmentCard } from './TrackShipmentCard';
import { TrackSteps } from './TrackSteps';
import { TrackSummaryCard } from './TrackSummaryCard';

/** Müşteriye açık sipariş takibi. Fiyatlar perakende (KATMAN 3). */
export function TrackOrderView({ order }: { order: TrackedOrder }) {
  const summary = trackSummary(order);
  const { original, remaining, changed } = summary;
  const activeIndex = stepIndexOf(getEffectiveStatus(order));
  const history = mergedHistory(order);
  const allShipments = displayShipments(order, original);

  return (
    <div className="space-y-6">
      {activeIndex === -1 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-bold text-red-800">
            {order.status === 'returned' ? 'Sipariş İade Edildi' : 'Sipariş İptal Edildi'}
          </p>
          <p className="mt-1 text-xs text-red-600">
            Bu sipariş için aktif bir işlem bulunmamaktadır.
          </p>
        </div>
      ) : (
        <TrackSteps activeIndex={activeIndex} />
      )}

      {/* Sipariş Temel Bilgileri */}
      <div className={CARD}>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-slate-500">Sipariş No</span>
          <span className="font-mono font-bold text-slate-900">{order.order_no}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-sm mt-2">
          <span className="text-slate-500">Sipariş Tarihi</span>
          <span className="text-slate-700">{formatDateTime(order.created_at)}</span>
        </div>
        {order.customer_name && (
          <div className="flex flex-wrap justify-between gap-2 text-sm mt-2">
            <span className="text-slate-500">Müşteri</span>
            <span className="text-slate-700">{order.customer_name}</span>
          </div>
        )}
      </div>

      {/* Sipariş Özeti ve Fiyat Kırılımı */}
      <div className="space-y-4">
        {changed && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
            <span className="font-bold">Bilgi:</span> Sipariş içeriğinde değişiklik yapılmıştır.
            Aşağıda güncel durum ve teslim edilen ürünler gösterilmektedir.
          </div>
        )}

        <TrackLines title="Sipariş Edilen Ürünler (İlk Hâl)" lines={original} />

        {changed && <TrackLines title="Kalan / Güncel Ürünler" lines={remaining} />}
      </div>

      {summary.originalTotal > 0 && <TrackSummaryCard summary={summary} />}

      {order.note && (
        <div className={CARD}>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Sipariş Notu
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{order.note}</p>
        </div>
      )}

      {/* Sevkiyatlar ve İptaller Bölümü */}
      {allShipments.length > 0 && (
        <div className={CARD}>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Sevkiyat ve İptal Detayları
          </h3>
          <div className="space-y-4">
            {allShipments.map((s) => (
              <TrackShipmentCard key={s.id} s={s} order={order} original={original} />
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && <TrackHistory history={history} />}

      <TrackCustomerDeliveries order={order} />
    </div>
  );
}
