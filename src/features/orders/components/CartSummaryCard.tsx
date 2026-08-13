import { formatMoney } from '@/lib/format';
import type { CartTotals } from '../domain/cart';

interface Props {
  totals: CartTotals;
  /** Siparişin yazılacağı üretici — hangi tedarikçiye gittiği belirsiz kalmasın. */
  supplierName: string | null;
}

/**
 * Sipariş özeti.
 *
 * BAĞLAYICI SAYI "üreticiye ödenecek" tutardır: cariye borç olarak o yazılır.
 * Beklenen ciro ve kâr perakendecinin kendi satış fiyatından (KATMAN 3) çıkar
 * ve üreticiye HİÇ gitmez (A4). Eskiden özet yalnız perakende toplamını
 * gösteriyordu; kullanıcı iki katı borçlandığını sanıyordu.
 *
 * İskonto burada gösterilmez: uygulanan oran `place_order_atomic` içinde
 * ilişkinin `discount_rate` değerinden hesaplanır (A5 — iskontoyu üretici
 * belirler) ve `supplierUnitPrice` zaten iskontolu gelir.
 */
export function CartSummaryCard({ totals, supplierName }: Props) {
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

        <div className="flex justify-between items-center border-t border-slate-100 pt-3">
          <span className="text-sm font-bold text-slate-800">Üreticiye Ödenecek</span>
          <span className="text-xl font-bold text-slate-900">
            {formatMoney(totals.supplierTotal)}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 -mt-1">Cari hesabınıza borç olarak bu tutar işlenir.</p>

        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Beklenen ciro</span>
            <span className="font-semibold text-slate-700">{formatMoney(totals.retailTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Beklenen kâr</span>
            <span
              className={`font-bold ${totals.expectedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {formatMoney(totals.expectedProfit)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Satış fiyatınız ve kârınız yalnız size görünür; üreticiye iletilmez.
          </p>
        </div>
      </div>
    </div>
  );
}
