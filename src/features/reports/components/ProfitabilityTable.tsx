import { TH, THEAD } from '@/components/ui/Table';
import { formatMoney } from '@/lib/format';
import { marginPercent, type ProfitRow } from '../domain/profitability';

const TD = 'px-5 py-3.5 whitespace-nowrap';

/** Marj bandı: kırmızı zarar, kehribar zayıf, yeşil sağlıklı. */
function marginBadge(margin: number | null): string {
  if (margin === null) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (margin > 30) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  if (margin > 15) return 'bg-amber-50 border-amber-200 text-amber-700';
  if (margin <= 0) return 'bg-red-50 border-red-200 text-red-700';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

/** Karlılık Analizi Tablosu — Masaüstünde geniş tablo, mobilde Akıllı Kartlar. */
export function ProfitabilityTable({ rows }: { rows: ProfitRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
        <p className="text-xs font-semibold text-slate-400 italic">
          Kriterlere uygun satış verisi bulunamadı.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {rows.map((item) => {
          const margin = marginPercent(item.totalProfit, item.totalRevenue);

          return (
            <div
              key={`${item.product.id}-${item.retailerName}`}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-shadow hover:shadow-md"
            >
              {/* Kart Başlığı: Ürün Adı, Kodu & Marj Rozeti */}
              <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-slate-900 block truncate" title={item.product.name}>
                    {item.product.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-slate-400">
                      {item.product.code}
                    </span>
                    {item.product.category && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                        {item.product.category}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-extrabold border shrink-0 ${marginBadge(
                    margin
                  )}`}
                >
                  {margin === null ? '—' : `%${margin.toFixed(1)} Marj`}
                </span>
              </div>

              {/* Kart Gövdesi: 2 Sütunlu Finansal Dağılım */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 bg-slate-50/60 rounded-xl p-3 my-3 border border-slate-100 text-xs">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Perakendeci (Bayi)
                  </span>
                  <span className="font-extrabold text-slate-900 block mt-0.5 truncate" title={item.retailerName}>
                    {item.retailerName}
                  </span>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Satılan Miktar
                  </span>
                  <span className="font-extrabold text-slate-900 block mt-0.5 font-mono">
                    {item.totalQty} Adet
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Toplam Maliyet
                  </span>
                  <span className="font-bold text-slate-600 block mt-0.5 font-mono">
                    {formatMoney(item.totalCost)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Toplam Ciro
                  </span>
                  <span className="font-extrabold text-slate-900 block mt-0.5 font-mono">
                    {formatMoney(item.totalRevenue)}
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Net Kâr
                  </span>
                  <span className="font-black text-emerald-700 text-sm font-mono">
                    {formatMoney(item.totalProfit)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-[1000px] lg:min-w-full">
            <thead className={THEAD}>
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
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${marginBadge(
                          margin
                        )}`}
                      >
                        {margin === null ? '—' : `%${margin.toFixed(1)}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
