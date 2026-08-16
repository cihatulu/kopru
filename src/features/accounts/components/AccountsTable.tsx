import { Button } from '@/components/ui/Button';
import { TBODY, TH, THEAD, TH_NUM, TableEmpty } from '@/components/ui/Table';
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

/** Cari Hesaplar listesi — kaynak ekranın karşılığı. */
export function AccountsTable({ rows, isManufacturer, onOpen }: Props) {
  const labels = columnLabels(isManufacturer);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
      <table className="min-w-[860px] lg:w-full">
        <thead className={THEAD}>
          <tr>
            <th className={TH}>Firma Adı</th>
            <th className={`${TH_NUM} text-red-600`}>{labels.debit}</th>
            <th className={`${TH_NUM} text-emerald-600`}>{labels.credit}</th>
            <th className={TH_NUM}>Bakiye</th>
            <th className={TH_NUM}>İşlemler</th>
          </tr>
        </thead>

        <tbody className={`${TBODY} bg-white`}>
          {rows.length === 0 && (
            <TableEmpty colSpan={5}>Aktif cari hesabınız yok.</TableEmpty>
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
                <td className="whitespace-nowrap px-6 py-3">
                  <p className="font-bold text-slate-800">{r.companyName}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{r.vknTc}</p>
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-right font-bold text-red-600">
                  {formatMoney(borcAmount)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-right font-bold text-emerald-600">
                  {formatMoney(alacakAmount)}
                </td>
                <td className={`whitespace-nowrap px-6 py-3 text-right font-extrabold ${tone}`}>
                  {formatMoney(Math.abs(r.balance))} {balanceSuffix(side)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-right">
                  {/* Satır eylemi ikincil: tabloda yirmi satır boyunca
                      tekrarlanan bir düğme birincil renkle çizilmemeli. */}
                  <Button variant="secondary" size="sm" onClick={() => onOpen(r)}>
                    Hesap Detayı
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
