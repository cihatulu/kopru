import { TH, THEAD } from '@/components/ui/Table';
import React, { useState } from 'react';
import { formatDate, formatMoney } from '@/lib/format';
import { columnLabels } from '../domain/accountView';
import type { LedgerEntry } from '../domain/ledgerEntry';
import { EditManualTransactionDialog } from './EditManualTransactionDialog';
import { LedgerEntryDetail } from './LedgerEntryDetail';

const TD = 'px-4 py-3 align-middle';

interface Props {
  entries: LedgerEntry[];
  counterpartyName?: string;
  isManufacturer?: boolean;
  canWrite?: boolean;
}

/**
 * Cari ekstre.
 *
 * Tutarlar YALNIZ KATMAN 2'den gelir (A5): üreticinin satış fiyatı =
 * perakendecinin maliyeti. Perakendecinin kendi satış fiyatı bu deftere girmez.
 *
 * `balance_after` her satırda saklıdır (A18); ekranda yeniden toplanmaz —
 * geçmişe dönük bir satır eklense bile gösterilen bakiye o anın gerçeğidir.
 */
export function LedgerTable({
  entries,
  counterpartyName = '',
  isManufacturer = false,
  canWrite = true,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const labels = columnLabels(isManufacturer);

  if (entries.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Bu hesapta henüz hareket yok.
      </p>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      <div className="max-h-[62vh] overflow-y-auto overflow-x-auto rounded-xl bg-white ring-1 ring-inset ring-slate-200">
        <table className="w-full min-w-[700px] border-collapse text-sm">
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
              const showInLeftBorc = isManufacturer ? e.type === 'credit' : e.type === 'debit';
              const showInRightAlacak = isManufacturer ? e.type === 'debit' : e.type === 'credit';
              const isExpanded = expandedId === e.id;
              const hasDetails = (e.itemsSnapshot && e.itemsSnapshot.length > 0) || !!e.orderId;
              const isManual = !e.orderId;

              return (
                <React.Fragment key={e.id}>
                  <tr
                    onClick={() => hasDetails && toggleExpand(e.id)}
                    className={`transition-colors ${hasDetails ? 'cursor-pointer hover:bg-slate-50/80' : ''} ${
                      isExpanded ? 'bg-slate-50/90' : ''
                    }`}
                  >
                    <td className={`${TD} whitespace-nowrap text-xs text-slate-500`}>
                      {formatDate(e.createdAt)}
                    </td>
                    <td className={`${TD} text-slate-700 font-medium`}>
                      <div className="flex items-center gap-1.5">
                        {hasDetails && (
                          <span className="text-slate-400 text-xs">{isExpanded ? '▾' : '▸'}</span>
                        )}
                        <span>{e.description}</span>
                      </div>
                    </td>
                    <td className={`${TD} text-right font-semibold text-red-600`}>
                      {showInLeftBorc ? formatMoney(e.amount) : '—'}
                    </td>
                    <td className={`${TD} text-right font-semibold text-emerald-600`}>
                      {showInRightAlacak ? formatMoney(e.amount) : '—'}
                    </td>
                    <td className={`${TD} text-right font-bold text-slate-900`}>
                      {formatMoney(e.balanceAfter)}
                    </td>
                    <td className={`${TD} text-center`}>
                      {hasDetails ? (
                        <button
                          type="button"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            toggleExpand(e.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors shadow-xs"
                        >
                          <span>Detay</span>
                          <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                        </button>
                      ) : isManual && canWrite ? (
                        <button
                          type="button"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            setEditingEntry(e);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs"
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
                      <td colSpan={6} className="px-6 py-4">
                        <LedgerEntryDetail entry={e} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingEntry && (
        <EditManualTransactionDialog
          entry={editingEntry}
          counterpartyName={counterpartyName}
          isManufacturer={isManufacturer}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </>
  );
}
