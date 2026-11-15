import { formatDateTime } from '@/lib/format';
import { ORDER_STATUS_META } from '../domain/status';
import type { AggregatedLine, TrackedOrder, TrackedShipment } from '../domain/tracking';
import { cleanPublicNote } from '../domain/trackingNotes';
import { TrackCancelledTable } from './TrackCancelledTable';
import { TrackDeliveredTable } from './TrackDeliveredTable';
import { TrackReturnedTable } from './TrackReturnedTable';

/** Tek sevkiyat kartı: başlık, kalem tablosu, iadeler, geçmiş ve not. */
export function TrackShipmentCard({ s, order, original }: {
  s: TrackedShipment;
  order: TrackedOrder;
  original: AggregatedLine[];
}) {
  const isCancelled = s.status === 'cancelled';
  const isParent = s.id === 'parent-shipment';
  const cardTitle = isParent
    ? isCancelled
      ? `İptal Edilen Sevkiyat (Sevk No: ${s.order_no})`
      : `Kalan Sevkiyat (Sevk No: ${s.order_no})`
    : `Sevkiyat (Sevk No: ${s.order_no})`;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isCancelled 
          ? 'border-red-200 bg-red-50/20' 
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
        <div>
          <span className={`text-xs font-bold ${isCancelled ? 'text-red-900 font-extrabold' : 'text-slate-800'}`}>
            {cardTitle}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
            {formatDateTime(s.created_at)}
          </span>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
            isCancelled 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : s.status === 'delivered' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-purple-50 text-purple-700 border border-purple-200'
          }`}
        >
          {ORDER_STATUS_META[s.status]?.label ?? s.status}
        </span>
      </div>

      {isCancelled ? (
        <TrackCancelledTable items={s.items} />
      ) : (
        <div>
          <TrackDeliveredTable s={s} original={original} />
          {s.returned_items && s.returned_items.length > 0 && (
            <TrackReturnedTable s={s} order={order} original={original} />
          )}
        </div>
      )}

    {s.history && s.history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block mb-2.5">Geçmiş ve İşlem Notları</span>
          <div className="relative pl-4 border-l border-slate-100 ml-1 space-y-3">
            {s.history.map((h, idx) => {
              const isReturn = h.status === 'returned' || h.note?.includes('İade');
              const isCancel = h.status === 'cancelled';
              const statusLabel = isReturn
                ? (h.note?.includes('Kısmi') ? 'Kısmi İade' : 'İade Edildi')
                : isCancel
                  ? 'İptal Edildi'
                  : (ORDER_STATUS_META[h.status]?.label ?? h.status);

              return (
                <div key={idx} className="relative text-xs">
                  <span className={`absolute -left-[21px] top-1.5 size-1.5 rounded-full ${isReturn || isCancel ? 'bg-red-500' : 'bg-slate-350'}`} />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold ${isReturn || isCancel ? 'text-red-700' : 'text-slate-700'}`}>
                      {statusLabel}
                    </span>
                    <span className="font-mono text-slate-400 text-[10px]">{formatDateTime(h.created_at)}</span>
                  </div>
                  {(() => {
                    const publicNote = cleanPublicNote(h.note);
                    if (!publicNote) return null;
                    return (
                      <p className="mt-1 text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2 leading-relaxed whitespace-pre-line font-medium text-[11px] break-words break-all [overflow-wrap:anywhere]">
                        {publicNote}
                      </p>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {s.note && (!s.history || s.history.length === 0) && (() => {
        const publicNote = cleanPublicNote(s.note);
        if (!publicNote) return null;
        return (
          <div className="mt-2 text-xs bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block mb-0.5">Açıklama / Sevk Kodu</span>
            <p className="text-slate-650 leading-relaxed font-medium whitespace-pre-line break-words break-all [overflow-wrap:anywhere]">{publicNote}</p>
          </div>
        );
      })()}
    </div>
  );
}
