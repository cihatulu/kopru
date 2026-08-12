import { formatMoney } from '@/lib/format';
import { marginPercent, type ProfitRow } from '../domain/profitability';

const TH = 'px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest';
const TD = 'px-5 py-3.5 whitespace-nowrap';

/** Marj bandı: kırmızı zarar, kehribar zayıf, yeşil sağlıklı. */
function marginBadge(margin: number | null): string {
  if (margin === null) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (margin > 30) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  if (margin > 15) return 'bg-amber-50 border-amber-250 text-amber-700';
  if (margin <= 0) return 'bg-rose-50 border-rose-200 text-rose-700';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function ProfitabilityTable({ rows }: { rows: ProfitRow[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-[1000px] lg:min-w-full">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className={`${TH} text-left`}>Ürün</th>
              <th className={`${TH} text-left`}>Kategori</th>
              <th className={`${TH} text-left`}>Perakendeci</th>
              <th className={`${TH} text-center`}>Satılan</th>
              <th className={`${TH} text-right`}>Toplam Maliyet</th>
              <th className={`${TH} text-right`}>Toplam Ciro</th>
              <th className={`${TH} text-right`}>Net Kâr</th>
              <th className={`${TH} text-center`}>Marj (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {rows.map((item) => {
              const margin = marginPercent(item.totalProfit, item.totalRevenue);
              return (
                <tr
                  key={`${item.product.id}-${item.retailerName}`}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className={TD}>
                    <div className="font-bold text-slate-800 text-sm">{item.product.name}</div>
                    <div className="text-xs text-slate-450 mt-0.5">{item.product.code}</div>
                  </td>
                  <td className={`${TD} text-sm text-slate-500`}>{item.product.category || '—'}</td>
                  <td className={`${TD} text-sm text-slate-600 font-bold`}>{item.retailerName}</td>
                  <td className={`${TD} text-center text-sm font-black text-slate-800`}>
                    {item.totalQty}
                  </td>
                  <td className={`${TD} text-right text-sm text-slate-500`}>
                    {formatMoney(item.totalCost)}
                  </td>
                  <td className={`${TD} text-right text-sm font-bold text-slate-700`}>
                    {formatMoney(item.totalRevenue)}
                  </td>
                  <td className={`${TD} text-right text-sm font-extrabold text-emerald-600`}>
                    {formatMoney(item.totalProfit)}
                  </td>
                  <td className={`${TD} text-center`}>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${marginBadge(margin)}`}
                    >
                      {margin === null ? '—' : `%${margin.toFixed(1)}`}
                    </span>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-450 italic">
                    Kriterlere uygun satış verisi bulunamadı.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
