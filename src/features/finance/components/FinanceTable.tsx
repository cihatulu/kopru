import { formatDate, formatMoney } from '@/lib/format';
import { FINANCE_KIND_LABELS, PAYMENT_METHOD_LABELS, affectsOwnCash } from '../domain/finance';
import type { FinanceEntry } from '../api/useFinance';

const TH = 'px-4 py-2.5 text-left text-xs font-semibold text-slate-500';
const TD = 'px-4 py-3 align-middle';

export function FinanceTable({ entries }: { entries: FinanceEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Henüz kayıt yok.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-inset ring-slate-200">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={TH}>Tarih</th>
            <th className={TH}>Açıklama</th>
            <th className={TH}>Yöntem</th>
            <th className={`${TH} text-right`}>Gelir</th>
            <th className={`${TH} text-right`}>Gider</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50/60">
              <td className={`${TD} whitespace-nowrap text-xs text-slate-500`}>
                {formatDate(e.occurredOn)}
              </td>
              <td className={`${TD} text-slate-700`}>
                {e.description}
                {e.category && <span className="ml-2 text-xs text-slate-400">{e.category}</span>}
              </td>
              <td className={`${TD} text-xs text-slate-500`}>
                {PAYMENT_METHOD_LABELS[e.method]}
                {!affectsOwnCash(e.method) && (
                  <span
                    className="ml-1.5 text-amber-700"
                    title="Tahsilat doğrudan üreticiye gider; kendi kasanıza girmez"
                  >
                    · kasa dışı
                  </span>
                )}
              </td>
              <td className={`${TD} text-right text-emerald-700`}>
                {e.kind === 'income' ? formatMoney(e.amount) : '—'}
              </td>
              <td className={`${TD} text-right text-slate-900`}>
                {e.kind === 'expense' ? formatMoney(e.amount) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
        {FINANCE_KIND_LABELS.income} / {FINANCE_KIND_LABELS.expense} defteri tedarikçi carinizden
        ayrıdır.
      </p>
    </div>
  );
}
