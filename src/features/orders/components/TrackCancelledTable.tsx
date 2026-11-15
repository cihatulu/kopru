import { formatMoney } from '@/lib/format';
import type { TrackedItem } from '../domain/tracking';

/** İptal edilen sevkiyatın kalemleri — tahsil edilmez. */
export function TrackCancelledTable({ items }: { items: TrackedItem[] }) {
  return (
    <div className="mt-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-red-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <th className="pb-2 text-left">Durum</th>
            <th className="pb-2 pl-2 text-left">Ürün</th>
            <th className="pb-2 text-center">Adet</th>
            <th className="pb-2 text-right">Birim Fiyat</th>
            <th className="pb-2 text-right">İptal Tutarı</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={`${item.productId ?? item.name}-${idx}`} className="border-b border-slate-50">
              <td className="py-2 pr-2">
                <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-200">
                  ✕ İptal
                </span>
              </td>
              <td className="py-2 pl-2 font-semibold text-slate-700">{item.name}</td>
              <td className="py-2 text-center text-slate-600 font-bold">{item.quantity} Adet</td>
              <td className="py-2 text-right text-slate-500">
                {item.unit_price > 0 ? formatMoney(item.unit_price) : '—'}
              </td>
              <td className="py-2 text-right font-semibold text-red-500 line-through">
                {item.unit_price > 0 ? formatMoney(item.unit_price * item.quantity) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2.5 flex items-center justify-between border-t border-red-100 pt-2 text-xs">
        <span className="font-bold text-slate-600">
          İptal Edilen Toplam Tutar:{' '}
          <span className="font-mono text-red-600 font-bold">
            {formatMoney(items.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0))}
          </span>
        </span>
        <span className="text-[11px] font-semibold text-slate-400">
          Tahsil Edilmez (₺0,00)
        </span>
      </div>
    </div>
  );
}
