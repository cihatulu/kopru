import { formatMoney, formatDateTime } from '@/lib/format';
import { ORDER_STATUS_META } from '../domain/status';
import { TrackSteps } from './TrackSteps';
import {
  aggregate,
  isCustomerPayment,
  linesTotal,
  sourcesOf,
  stepIndexOf,
  type AggregatedLine,
  type TrackedOrder,
} from '../domain/tracking';

const CARD = 'rounded-xl border border-slate-200 bg-white p-4';

const Lines = ({ title, lines }: { title: string; lines: AggregatedLine[] }) => (
  <div className={CARD}>
    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</h3>
    <ul className="divide-y divide-slate-50">
      {lines.map((l) => (
        <li key={l.key} className="flex items-center justify-between py-2.5 text-sm">
          <div>
            <p className="font-semibold text-slate-800">{l.name}</p>
            <p className="text-xs text-slate-400">{l.quantity} adet</p>
          </div>
          {l.unitPrice > 0 && (
            <span className="font-bold text-slate-900 whitespace-nowrap">
              {formatMoney(l.unitPrice * l.quantity)}
            </span>
          )}
        </li>
      ))}
      {lines.length === 0 && <li className="py-3 text-xs italic text-slate-400">Kayıt yok.</li>}
    </ul>
  </div>
);

/** Müşteriye açık sipariş takibi. Fiyatlar perakende (KATMAN 3). */
export function TrackOrderView({ order }: { order: TrackedOrder }) {
  const sources = sourcesOf(order);
  const original = aggregate(sources, 'original');
  const remaining = aggregate(sources, 'remaining');
  const activeIndex = stepIndexOf(order.status);

  const originalTotal = linesTotal(original);
  const paid = order.payments
    .filter(isCustomerPayment)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = originalTotal - paid;
  const changed = remaining.length !== original.length ||
    remaining.some((r, i) => r.quantity !== original[i]?.quantity);

  return (
    <div className="space-y-6">
      {activeIndex === -1 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-center">
          <p className="font-bold text-rose-900 text-sm">
            {ORDER_STATUS_META[order.status].label}
          </p>
          <p className="text-xs text-rose-600 mt-0.5">
            Bu sipariş {order.status === 'cancelled' ? 'iptal edilmiştir' : 'iade edilmiştir'}.
          </p>
        </div>
      ) : (
        <TrackSteps activeIndex={activeIndex} />
      )}

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

      <Lines title="Sipariş Edilen Ürünler" lines={original} />

      {/* Kalan liste yalnız iade/iptal sonrası ORİJİNALDEN farklıysa anlamlı. */}
      {changed && <Lines title="Güncel Durum (İade / İptal Sonrası)" lines={remaining} />}

      {originalTotal > 0 && (
        <div className={CARD}>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Sipariş Tutarı</span>
            <span className="font-semibold text-slate-800">{formatMoney(originalTotal)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-slate-500">Ödenen</span>
            <span className="font-semibold text-emerald-600">{formatMoney(paid)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2 border-t border-slate-100 pt-2">
            <span className="font-bold text-slate-800">Kalan Bakiye</span>
            <span className="font-bold text-slate-900">{formatMoney(balance)}</span>
          </div>
        </div>
      )}

      {order.history.length > 0 && (
        <div className={CARD}>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Sipariş Geçmişi
          </h3>
          <ul className="space-y-2.5">
            {order.history.map((h, i) => (
              <li key={`${h.created_at}-${i}`} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-slate-400">{formatDateTime(h.created_at)}</span>
                <span className="font-semibold text-slate-700">
                  {ORDER_STATUS_META[h.status]?.label ?? h.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
