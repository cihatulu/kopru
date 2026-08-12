import { formatMoney } from '@/lib/format';
import {
  balanceSide,
  balanceSuffix,
  columnLabels,
  type AccountRow,
} from '../domain/accountView';

interface Props {
  rows: AccountRow[];
  isManufacturer: boolean;
  onOpen: (row: AccountRow) => void;
}

const TH = 'px-6 py-4 text-xs font-semibold whitespace-nowrap';

/** Cari Hesaplar listesi — kaynak ekranın karşılığı. */
export function AccountsTable({ rows, isManufacturer, onOpen }: Props) {
  const labels = columnLabels(isManufacturer);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-[860px] divide-y divide-slate-100 lg:w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className={`${TH} text-left text-slate-500`}>Firma Adı</th>
            <th className={`${TH} text-right text-red-600`}>{labels.debit}</th>
            <th className={`${TH} text-right text-emerald-600`}>{labels.credit}</th>
            <th className={`${TH} text-right text-slate-500`}>Bakiye</th>
            <th className={`${TH} text-right text-slate-500`}>İşlemler</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-16 text-center text-sm italic text-slate-400">
                Aktif cari hesabınız yok.
              </td>
            </tr>
          )}

          {rows.map((r) => {
            const side = balanceSide(r.balance, isManufacturer);
            const tone =
              side === 'receivable'
                ? 'text-emerald-600'
                : side === 'payable'
                  ? 'text-red-600'
                  : 'text-slate-500';

            const borcAmount = isManufacturer ? r.totalCredit : r.totalDebit;
            const alacakAmount = isManufacturer ? r.totalDebit : r.totalCredit;

            return (
              <tr key={r.relationshipId} className="transition-colors hover:bg-slate-50/40">
                <td className="whitespace-nowrap px-6 py-5">
                  <p className="font-bold text-slate-800">{r.companyName}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{r.vknTc}</p>
                </td>
                <td className="whitespace-nowrap px-6 py-5 text-right font-bold text-red-600">
                  {formatMoney(borcAmount)}
                </td>
                <td className="whitespace-nowrap px-6 py-5 text-right font-bold text-emerald-600">
                  {formatMoney(alacakAmount)}
                </td>
                <td className={`whitespace-nowrap px-6 py-5 text-right font-extrabold ${tone}`}>
                  {formatMoney(Math.abs(r.balance))} {balanceSuffix(side)}
                </td>
                <td className="whitespace-nowrap px-6 py-5 text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(r)}
                    className="rounded-lg bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Hesap Detayı
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
