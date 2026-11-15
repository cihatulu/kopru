import { formatDateTime } from '@/lib/format';
import { ORDER_STATUS_META } from '../domain/status';
import type { TrackedLog } from '../domain/tracking';
import { cleanPublicNote } from '../domain/trackingNotes';
import { TRACK_CARD as CARD } from './TrackLines';

/** Kök ve sevkiyatların birleşik sipariş geçmişi. */
export function TrackHistory({ history }: { history: TrackedLog[] }) {
  return (
    <div className={CARD}>
      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
        Sipariş Geçmişi
      </h3>
      <div className="relative pl-6 border-l-2 border-slate-100 ml-3 space-y-6">
        {history.map((h, i) => {
          const isReturnLog = h.status === 'returned' || h.note?.includes('İade');
          const isCancelLog = h.status === 'cancelled';
          const meta = ORDER_STATUS_META[h.status];
          const dotColor = isReturnLog || isCancelLog
            ? 'bg-red-500 ring-red-100'
            : h.status === 'delivered'
              ? 'bg-emerald-500 ring-emerald-100'
              : h.status === 'shipped' || h.status === 'partially_shipped'
                ? 'bg-purple-500 ring-purple-100'
                : 'bg-blue-500 ring-blue-100';

          const displayLabel = isReturnLog
            ? (h.note?.includes('Kısmi') ? 'Kısmi İade' : 'İade Edildi')
            : (meta?.label ?? h.status);

          const publicNote = cleanPublicNote(h.note);

          return (
            <div key={`${h.created_at}-${i}`} className="relative min-w-0">
              <span className={`absolute -left-[31px] top-1.5 size-2.5 rounded-full ${dotColor} ring-4`} />
              
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {formatDateTime(h.created_at)}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold ${isReturnLog || isCancelLog ? 'text-red-700' : 'text-slate-800'}`}>
                    {displayLabel}
                  </span>
                  {h.order_no && (
                    <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 leading-tight">
                      {h.order_no}
                    </span>
                  )}
                </div>
                {publicNote && (
                  <p className="mt-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2.5 leading-relaxed whitespace-pre-line font-medium break-words break-all [overflow-wrap:anywhere]">
                    {publicNote}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
