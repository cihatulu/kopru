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

/** Cari Hesaplar listesi — Masaüstünde geniş tablo, mobilde Akıllı Kart görünümü. */
export function AccountsTable({ rows, isManufacturer, onOpen }: Props) {
  const labels = columnLabels(isManufacturer);

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm italic text-slate-500 shadow-sm">
        Aktif cari hesabınız yok.
      </p>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {rows.map((r) => {
          const side = balanceSide(r.balance, isManufacturer);
          const borcAmount = isManufacturer ? r.totalCredit : r.totalDebit;
          const alacakAmount = isManufacturer ? r.totalDebit : r.totalCredit;

          return (
            <div
              key={r.relationshipId}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-shadow hover:shadow-md"
            >
              {/* Kart Başlığı: Firma Adı & Bakiye Rozeti */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-slate-900 text-sm truncate" title={r.companyName}>
                      {r.companyName}
                    </p>
                    {r.counterpartyIsSubscriber ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        ÜYE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        MİSAFİR
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-slate-400 font-medium">{r.vknTc}</p>
                </div>

                {/* Bakiye Rozeti */}
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                      side === 'receivable'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : side === 'payable'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {formatMoney(Math.abs(r.balance))} {balanceSuffix(side)}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                    Güncel Bakiye
                  </span>
                </div>
              </div>

              {/* Kart Gövdesi: Borç ve Alacak Toplamları */}
              <div className="grid grid-cols-2 gap-3 py-3 text-xs bg-slate-50/50 rounded-xl p-2.5 my-3 border border-slate-100">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {labels.debit}
                  </span>
                  <span className="text-sm font-black text-red-600 block mt-0.5">
                    {formatMoney(borcAmount)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {labels.credit}
                  </span>
                  <span className="text-sm font-black text-emerald-600 block mt-0.5">
                    {formatMoney(alacakAmount)}
                  </span>
                </div>
              </div>

              {/* Kart Aksiyonu: Hesap Detayı Butonu */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpen(r)}
                className="w-full justify-center text-xs font-semibold"
              >
                Hesap Detayı & Ekstre Gör
              </Button>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
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
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800">{r.companyName}</p>
                      {r.counterpartyIsSubscriber ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                          ÜYE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          MİSAFİR
                        </span>
                      )}
                    </div>
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
    </div>
  );
}
