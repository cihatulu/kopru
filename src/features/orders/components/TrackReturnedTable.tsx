import { formatMoney } from '@/lib/format';
import type { AggregatedLine, TrackedOrder, TrackedShipment } from '../domain/tracking';
import { returnedLines } from '../domain/trackingTotals';

/** Sevkiyattan iade edilen ürünler ve perakende tutarları. */
export function TrackReturnedTable({ s, order, original }: {
  s: TrackedShipment;
  order: TrackedOrder;
  original: AggregatedLine[];
}) {
  const { lines: returnedList, total: totalReturnInShipment } = returnedLines(s, order, original);
  return (
    <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
      <span className="font-bold text-amber-900 uppercase tracking-wider text-[9px] block mb-2">
        İade Edilen Ürün ve Fiyat Detayı
      </span>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-amber-200/60 text-[10px] font-bold uppercase text-amber-800/80">
              <th className="pb-1.5 text-left">Ürün</th>
              <th className="pb-1.5 text-center">İade Adedi</th>
              <th className="pb-1.5 text-right">Birim Fiyat</th>
              <th className="pb-1.5 text-right">İade Tutarı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {returnedList.map((item, rIdx) => (
              <tr key={rIdx} className="text-[11px]">
                <td className="py-1.5 font-semibold text-slate-800 pr-2">{item.rName}</td>
                <td className="py-1.5 text-center font-bold text-amber-900 whitespace-nowrap">{item.rQuantity} Adet</td>
                <td className="py-1.5 text-right text-slate-600 whitespace-nowrap">
                  {item.rUnitPrice > 0 ? formatMoney(item.rUnitPrice) : '—'}
                </td>
                <td className="py-1.5 text-right font-bold text-amber-950 whitespace-nowrap">
                  {item.rTotal > 0 ? formatMoney(item.rTotal) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalReturnInShipment > 0 && (
        <div className="mt-2.5 flex items-center justify-between border-t border-amber-200/80 pt-2 text-xs">
          <span className="font-bold text-slate-600">
            İade Edilen Toplam Tutar:{' '}
            <span className="font-mono text-red-600 font-bold">
              {formatMoney(totalReturnInShipment)}
            </span>
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            Tahsil Edilmez (₺0,00)
          </span>
        </div>
      )}
    </div>
  );
}
