import { formatMoney } from '@/lib/format';
import type { OrderItemRow } from '../domain/orderMapping';

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const CAPTION = 'text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5';

/** İşaretli tutar: eksi fark indirimdir ve öyle okunmalıdır. */
const signed = (n: number) => `${n > 0 ? '+' : '−'}${formatMoney(Math.abs(n))}`;

/** Sipariş detayının kalem tablosu. `OrderExpandedDetail`'den bütçe için ayrıldı. */
export function OrderItemsCard({
  items,
  totalAmount,
}: {
  items: OrderItemRow[];
  totalAmount: number;
}) {
  return (
    <div className={`${CARD} space-y-3`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className={CAPTION}>
          <span className="text-slate-400">•</span> SİPARİŞ EDİLEN ÜRÜNLER
        </h4>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {items.length} Kalem
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <th className="pb-2">Ürün Adı</th>
              <th className="pb-2 text-center">Miktar</th>
              <th className="pb-2 text-right">Birim Fiyat</th>
              <th className="pb-2 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((i) => (
              <tr key={i.id} className="text-slate-700 align-top">
                <td className="py-3 pr-2">
                  {/* Model kodu ayrıca yazılmaz — ürün adının içinde zaten var. */}
                  <p className="font-bold text-slate-800">{i.name}</p>
                  {/* Üretim talimatı: üretici bunu görmezse iş yapılamaz.
                      Tutar burada YAZILMAZ; kırılım sağdaki sütunda durur. */}
                  {i.customDescription && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold leading-snug text-amber-900 ring-1 ring-inset ring-amber-200">
                      Talep: {i.customDescription}
                    </p>
                  )}
                </td>
                <td className="py-3 text-center font-bold text-slate-900 whitespace-nowrap">
                  {i.quantity} Adet
                </td>
                {/* Ürünün kendi fiyatı: talep farkı bu tutara KARIŞMAZ. */}
                <td className="py-3 text-right text-slate-500 whitespace-nowrap">
                  {formatMoney(i.supplierUnitPrice)}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  <p className="font-bold text-slate-900">
                    {formatMoney(i.supplierUnitPrice * i.quantity)}
                  </p>
                  {i.priceDifference !== 0 && (
                    <>
                      <p
                        className={`mt-1 font-semibold ${
                          i.priceDifference > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {signed(i.priceDifference * i.quantity)}
                      </p>
                      <p className="mt-1 border-t border-slate-200 pt-1 font-bold text-slate-900">
                        {formatMoney(i.totalPrice)}
                      </p>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-xs">
        <span className="font-bold text-slate-700">Toplam Tutar:</span>
        <span className="font-extrabold text-slate-900 text-sm">{formatMoney(totalAmount)}</span>
      </div>
    </div>
  );
}
