import { formatMoney } from '@/lib/format';
import type { OrderItemRow } from '../domain/orderMapping';

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const CAPTION = 'text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5';

/**
 * Özel talep farkının kırılım metni.
 *
 * Fark birim fiyata ZATEN dahildir; bu satır yalnız "bu tutar neden böyle"
 * sorusunu yanıtlar. Eksi fark indirimdir ve işaretiyle yazılır.
 */
function DiffNote({ amount }: { amount: number }) {
  if (amount === 0) return null;
  return (
    <span className="ml-1 whitespace-nowrap">
      ({amount > 0 ? '+' : '−'}
      {formatMoney(Math.abs(amount))})
    </span>
  );
}

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
              <tr key={i.id} className="text-slate-700">
                <td className="py-3 pr-2">
                  <p className="font-bold text-slate-800">{i.name}</p>
                  <p className="font-mono text-[10px] text-slate-400">{i.code}</p>
                  {/* Üretim talimatı: üretici bunu görmezse iş yapılamaz. */}
                  {i.customDescription && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold leading-snug text-amber-900 ring-1 ring-inset ring-amber-200">
                      Talep: {i.customDescription}
                      <DiffNote amount={i.priceDifference} />
                    </p>
                  )}
                </td>
                <td className="py-3 text-center font-bold text-slate-900 whitespace-nowrap">
                  {i.quantity} Adet
                </td>
                <td className="py-3 text-right text-slate-500 whitespace-nowrap">
                  {formatMoney(i.supplierUnitPrice)}
                </td>
                <td className="py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                  {formatMoney(i.totalPrice)}
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
