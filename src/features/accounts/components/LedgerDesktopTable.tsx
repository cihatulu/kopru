import { Fragment } from 'react';
import { TH, THEAD } from '@/components/ui/Table';
import { formatDate, formatMoney } from '@/lib/format';
import { LedgerEntryDetail } from './LedgerEntryDetail';
import { ledgerRowView } from '../domain/ledgerEntry';
import { ReversedBadge, type LedgerRowsProps } from './LedgerRowParts';

const TD = 'px-4 py-3 align-middle';
const ACTION_BUTTON =
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer';

/** 🖥️ Masaüstü görünüm: 6 sütunlu geniş tablo (md ve üzeri). */
export function LedgerDesktopTable({
  entries,
  isManufacturer,
  labels,
  expandedId,
  stateOf,
  canEdit,
  onToggle,
  onEdit,
}: LedgerRowsProps) {
  return (
    <div className="hidden md:block max-h-[62vh] w-full overflow-y-auto overflow-x-auto rounded-xl bg-white border border-slate-200 shadow-2xs cancel-drag touch-pan-x touch-pan-y">
      <table className="w-full min-w-[620px] sm:min-w-[700px] border-collapse text-xs sm:text-sm text-left">
        <thead className={`sticky top-0 z-10 ${THEAD}`}>
          <tr>
            <th className={`${TH} text-left text-slate-500`}>Tarih</th>
            <th className={`${TH} text-left text-slate-500`}>Açıklama</th>
            <th className={`${TH} text-right text-red-600`}>{labels.debit}</th>
            <th className={`${TH} text-right text-emerald-600`}>{labels.credit}</th>
            <th className={`${TH} text-right text-slate-500`}>Bakiye</th>
            <th className={`${TH} text-center text-slate-500 w-24`}>İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e) => {
            const { showDebit, showCredit, hasDetails } = ledgerRowView(e, isManufacturer);
            const isExpanded = expandedId === e.id;

            return (
              <Fragment key={e.id}>
                <tr
                  onClick={() => hasDetails && onToggle(e.id)}
                  className={`transition-colors ${hasDetails ? 'cursor-pointer hover:bg-slate-50/80' : ''} ${
                    isExpanded ? 'bg-slate-50/90' : ''
                  }`}
                >
                  <td className={`${TD} whitespace-nowrap text-xs text-slate-500`}>
                    {formatDate(e.createdAt)}
                  </td>
                  <td className={`${TD} text-slate-700 font-medium max-w-[240px]`}>
                    <div className="flex min-w-0 items-center gap-1.5">
                      {hasDetails && (
                        <span className="shrink-0 text-slate-400 text-xs">
                          {isExpanded ? '▾' : '▸'}
                        </span>
                      )}
                      <span className="truncate" title={e.description}>
                        {e.description}
                      </span>
                      <ReversedBadge state={stateOf(e)} />
                    </div>
                  </td>
                  <td className={`${TD} text-right font-semibold text-red-600 whitespace-nowrap`}>
                    {showDebit ? formatMoney(e.amount) : '—'}
                  </td>
                  <td className={`${TD} text-right font-semibold text-emerald-600 whitespace-nowrap`}>
                    {showCredit ? formatMoney(e.amount) : '—'}
                  </td>
                  <td className={`${TD} text-right font-bold text-slate-900 whitespace-nowrap`}>
                    {formatMoney(e.balanceAfter)}
                  </td>
                  <td className={`${TD} text-center whitespace-nowrap`}>
                    {hasDetails ? (
                      <button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          onToggle(e.id);
                        }}
                        className={ACTION_BUTTON}
                      >
                        <span>Detay</span>
                        <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                      </button>
                    ) : canEdit(e) ? (
                      <button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          onEdit(e);
                        }}
                        className={`${ACTION_BUTTON} hover:text-slate-900`}
                      >
                        Düzenle
                      </button>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="bg-slate-50/90 border-b border-slate-200">
                    <td colSpan={6} className="px-4 sm:px-6 py-4">
                      <LedgerEntryDetail entry={e} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
