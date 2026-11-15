import { formatMoney } from '@/lib/format';
import type { TrackSummary } from '../domain/trackingTotals';
import { TRACK_CARD as CARD } from './TrackLines';

/** Sipariş tutarı, iptal/iade düşümü, ödenen ve kalan bakiye. */
export function TrackSummaryCard({ summary }: { summary: TrackSummary }) {
  const { originalTotal, activeTotal, totalReturnAmount, effectiveTotal, paid, balance } = summary;
  return (
    <div className={CARD}>
      {/* Orijinal Tutar (İptal veya İade Varsa Üstü Çizili Göster) */}
      {(originalTotal !== activeTotal || totalReturnAmount > 0) && (
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-slate-400">İlk Sipariş Tutarı</span>
          <span className="font-semibold text-slate-400 line-through">{formatMoney(originalTotal)}</span>
        </div>
      )}

      {/* İptal Edilen Tutar */}
      {originalTotal !== activeTotal && (
        <div className="flex justify-between text-sm mb-1.5 text-red-600">
          <span>İptal Edilen Tutar</span>
          <span className="font-semibold font-mono">−{formatMoney(originalTotal - activeTotal)}</span>
        </div>
      )}

      {/* İade Edilen Tutar */}
      {totalReturnAmount > 0 && (
        <div className="flex justify-between text-sm mb-1.5 text-amber-800">
          <span>İade Edilen Tutar</span>
          <span className="font-semibold font-mono">−{formatMoney(totalReturnAmount)}</span>
        </div>
      )}

      <div className={`flex justify-between text-sm ${(originalTotal !== activeTotal || totalReturnAmount > 0) ? 'pt-1.5 border-t border-slate-100' : ''}`}>
        <span className="text-slate-700 font-bold">
          {(originalTotal !== activeTotal || totalReturnAmount > 0) ? 'Güncel Sipariş Tutarı' : 'Sipariş Tutarı'}
        </span>
        <span className="font-bold text-slate-900">{formatMoney(effectiveTotal)}</span>
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
  );
}
