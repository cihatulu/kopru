import { formatMoney } from '@/lib/format';
import type { BreakdownRow } from '../domain/retailerReport';

const TH = 'px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest';
const TD = 'px-5 py-3.5 text-sm';

interface Props {
  title: string;
  /** İlk kolonun başlığı — üretici, durum ya da satışçı. */
  keyLabel: string;
  rows: BreakdownRow[];
}

/** Rapor kırılım tablosu; üç kırılım da aynı şekli kullanır. */
export function BreakdownTable({ title, keyLabel, rows }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className={`${TH} text-left`}>{keyLabel}</th>
              <th className={`${TH} text-right`}>Sipariş</th>
              <th className={`${TH} text-right`}>Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50/60 transition-colors">
                <td className={`${TD} font-semibold text-slate-800`}>{r.label}</td>
                <td className={`${TD} text-right text-slate-600`}>{r.orderCount}</td>
                <td className={`${TD} text-right font-bold text-slate-900 whitespace-nowrap`}>
                  {formatMoney(r.total)}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm italic text-slate-400">
                  Bu dönemde kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
