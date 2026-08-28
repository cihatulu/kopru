import { TH, THEAD } from '@/components/ui/Table';
import { formatDateTime, formatMoney } from '@/lib/format';
import { getManufacturerName } from '../domain/finance';
import type { FinanceTxRow } from '../domain/financeFilters';

const TD = 'px-5 py-3.5 text-sm';

interface Props {
  rows: FinanceTxRow[];
  /** Süzgeçten sonra hiç kayıt kalmadığında gösterilir. */
  emptyText: string;
  isEmpty: boolean;
}

/**
 * Kasa/POS defter tablosu — Masaüstünde geniş tablo, mobilde Akıllı Kartlar.
 */
export function FinanceTxTable({ rows, emptyText, isEmpty }: Props) {
  if (isEmpty || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-xs font-semibold text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {rows.map((t) => {
          const isIncome = t.type === 'income';
          const manufacturer = getManufacturerName(t);

          return (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
            >
              {/* Kart Başlığı: Müşteri Adı & İşlem Türü Rozeti */}
              <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-slate-900 block truncate" title={t.order?.customer_name || 'Kasa İşlemi'}>
                    {t.order?.customer_name || 'Kasa / POS İşlemi'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                    {formatDateTime(t.created_at)}
                  </span>
                </div>

                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-extrabold border shrink-0 ${
                    isIncome
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {isIncome ? '+ Giriş (Tahsilat)' : '− Çıkış (Gider/İade)'}
                </span>
              </div>

              {/* Kart Gövdesi: 2 Sütunlu Finansal Izgara */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 bg-slate-50/60 rounded-xl p-3 my-3 border border-slate-100 text-xs">
                {manufacturer !== '—' && (
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Üretici
                    </span>
                    <span className="font-extrabold text-slate-900 block mt-0.5 truncate" title={manufacturer}>
                      {manufacturer}
                    </span>
                  </div>
                )}

                <div className={manufacturer !== '—' ? 'text-right' : 'col-span-2'}>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Açıklama
                  </span>
                  <span className="font-semibold text-slate-700 block mt-0.5 truncate" title={t.description || '—'}>
                    {t.description || '—'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    İşlem Tutarı
                  </span>
                  <span
                    className={`font-black text-sm block mt-0.5 font-mono ${
                      isIncome ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {isIncome ? '+' : '−'}
                    {formatMoney(t.amount)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Kasa Bakiyesi
                  </span>
                  <span className="font-black text-slate-900 text-sm block mt-0.5 font-mono">
                    {formatMoney(t.runningBalance)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-xs">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead className={THEAD}>
            <tr className="border-b border-slate-100">
              <th className={TH}>Tarih</th>
              <th className={TH}>Müşteri Adı</th>
              <th className={TH}>Üretici Adı</th>
              <th className={TH}>Açıklama</th>
              <th className={`${TH} text-right text-emerald-600`}>Borç (Giriş)</th>
              <th className={`${TH} text-right text-red-600`}>Alacak (Çıkış)</th>
              <th className={`${TH} text-right`}>Bakiye</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                <td className={`${TD} text-slate-500`}>{formatDateTime(t.created_at)}</td>
                <td className={`${TD} font-semibold text-slate-800`}>{t.order?.customer_name || '—'}</td>
                <td className={`${TD} text-slate-600`}>{getManufacturerName(t)}</td>
                <td className={`${TD} text-slate-600 max-w-[200px] truncate`} title={t.description || ''}>
                  {t.description || '—'}
                </td>
                <td className={`${TD} text-right font-semibold text-emerald-600`}>
                  {t.type === 'income' ? formatMoney(t.amount) : '—'}
                </td>
                <td className={`${TD} text-right font-semibold text-red-600`}>
                  {t.type === 'expense' ? formatMoney(t.amount) : '—'}
                </td>
                <td className={`${TD} text-right font-bold text-slate-900`}>
                  {formatMoney(t.runningBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
