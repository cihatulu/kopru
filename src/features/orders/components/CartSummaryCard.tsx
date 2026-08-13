import { formatMoney } from '@/lib/format';

interface Props {
  subtotal: number;
  discountRate: number;
  /** Siparişin yazılacağı üretici — hangi tedarikçiye gittiği belirsiz kalmasın. */
  supplierName: string | null;
}

/**
 * Sipariş özeti.
 *
 * İskonto burada YALNIZCA gösterilir; uygulanan oran `place_order_atomic`
 * içinde ilişkinin `discount_rate` değerinden yeniden hesaplanır (A5 —
 * iskontoyu üretici belirler, istemci pazarlık edemez).
 */
export function CartSummaryCard({ subtotal, discountRate, supplierName }: Props) {
  const discountAmount = Math.round(((subtotal * discountRate) / 100) * 100) / 100;
  const grandTotal = subtotal - discountAmount;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Sipariş Özeti
        </span>
      </div>

      <div className="p-5 space-y-3">
        {supplierName && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Tedarikçi</span>
            <span className="font-semibold text-slate-700">{supplierName}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Ara Toplam</span>
          <span className="font-semibold text-slate-700">{formatMoney(subtotal)}</span>
        </div>

        {discountRate > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-emerald-600">İndirim (%{discountRate})</span>
            <span className="font-semibold text-emerald-600">−{formatMoney(discountAmount)}</span>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3 mt-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-800">Genel Toplam</span>
            <span className="text-xl font-bold text-slate-900">{formatMoney(grandTotal)}</span>
          </div>

          {discountRate > 0 && (
            <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              <p className="text-xs text-emerald-700 font-medium text-center">
                %{discountRate} özel indiriminiz uygulandı — {formatMoney(discountAmount)} tasarruf
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
