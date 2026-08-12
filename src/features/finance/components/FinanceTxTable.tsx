import { formatDateTime, formatMoney } from '@/lib/format';
import { getManufacturerName } from '../domain/finance';
import type { FinanceTxRow } from '../domain/financeFilters';

const TH = 'px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50';
const TD = 'px-5 py-3.5 text-sm';

interface Props {
  rows: FinanceTxRow[];
  /** Süzgeçten sonra hiç kayıt kalmadığında gösterilir. */
  emptyText: string;
  isEmpty: boolean;
}

/**
 * Kasa/POS defter tablosu.
 *
 * Üç sekme de aynı tabloyu kullanır — nakit, bizim POS ve üretici POS'u için
 * ayrı ayrı kopyalanmıştı; kolon değişikliği üç yerde unutulabiliyordu.
 */
export function FinanceTxTable({ rows, emptyText, isEmpty }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="w-full min-w-[800px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className={TH}>Tarih</th>
            <th className={TH}>Müşteri Adı</th>
            <th className={TH}>Üretici Adı</th>
            <th className={TH}>Açıklama</th>
            <th className={`${TH} text-right text-emerald-600`}>Borç (Giriş)</th>
            <th className={`${TH} text-right text-rose-600`}>Alacak (Çıkış)</th>
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
              <td className={`${TD} text-right font-semibold text-rose-600`}>
                {t.type === 'expense' ? formatMoney(t.amount) : '—'}
              </td>
              <td className={`${TD} text-right font-bold text-slate-900`}>
                {formatMoney(t.runningBalance)}
              </td>
            </tr>
          ))}

          {isEmpty && (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
