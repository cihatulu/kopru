import { formatDateTime, formatMoney } from '@/lib/format';
import type { LedgerEntry } from '../api/useAccounts';

const TH = 'px-4 py-2.5 text-left text-xs font-semibold text-slate-500';
const TD = 'px-4 py-3 align-middle';

/**
 * Cari ekstre.
 *
 * Tutarlar YALNIZ KATMAN 2'den gelir (A5): üreticinin satış fiyatı = perakendecinin
 * maliyeti. Perakendecinin kendi satış fiyatı bu deftere hiç girmez.
 *
 * `balance_after` her satırda saklıdır (A18); ekranda yeniden toplanmaz — böylece
 * geçmişe dönük bir satır eklense bile gösterilen bakiye o anın gerçeğidir.
 */
export function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Bu hesapta henüz hareket yok.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-inset ring-slate-200">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={TH}>Tarih</th>
            <th className={TH}>Açıklama</th>
            <th className={`${TH} text-right`}>Borç</th>
            <th className={`${TH} text-right`}>Alacak</th>
            <th className={`${TH} text-right`}>Bakiye</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50/60">
              <td className={`${TD} whitespace-nowrap text-xs text-slate-500`}>
                {formatDateTime(e.createdAt)}
              </td>
              <td className={`${TD} text-slate-700`}>{e.description}</td>
              <td className={`${TD} text-right text-slate-900`}>
                {e.type === 'debit' ? formatMoney(e.amount) : '—'}
              </td>
              <td className={`${TD} text-right text-slate-900`}>
                {e.type === 'credit' ? formatMoney(e.amount) : '—'}
              </td>
              <td className={`${TD} text-right font-medium text-slate-900`}>
                {formatMoney(e.balanceAfter)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
