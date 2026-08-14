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
 * YALNIZ MÜŞTERİ TUTARI GÖSTERİLİR. Sepet ekranı satış sırasında son
 * tüketiciye dönük duruyor; "üreticiye ödenecek" ve "beklenen kâr" burada
 * yazarken müşteri perakendecinin alış fiyatını ve kârını okuyabiliyordu.
 *
 * Bu iki sayı kaybolmuyor: sipariş verildikten sonra Siparişlerim detayında
 * ve Cari Hesabım ekranında görünür — ikisi de müşterinin önünde açılmaz.
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

        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Ürün adedi</span>
          <span className="font-semibold text-slate-700">{totals.itemCount} adet</span>
        </div>

        <div className="flex justify-between items-center border-t border-slate-100 pt-3">
          <span className="text-sm font-bold text-slate-800">Sipariş Tutarı</span>
          <span className="text-xl font-bold text-slate-900">
            {formatMoney(totals.retailTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
