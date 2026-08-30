import { TH, THEAD } from '@/components/ui/Table';
import React, { useState } from 'react';
import { formatDate, formatMoney } from '@/lib/format';
import { columnLabels } from '../domain/accountView';
import type { LedgerEntry } from '../domain/ledgerEntry';
import { EditManualTransactionDialog } from './EditManualTransactionDialog';
import { LedgerEntryDetail } from './LedgerEntryDetail';

const TD = 'px-4 py-3 align-middle';
const PER_PAGE = 10;

interface Props {
  entries: LedgerEntry[];
  counterpartyName?: string;
  isManufacturer?: boolean;
  canWrite?: boolean;
  counterpartyIsSubscriber: boolean;
}

/**
 * Cari ekstre tablosu — Masaüstünde geniş tablo, mobilde 10'arlı sayfalanan Akıllı Kartlar.
 */
export function LedgerTable({
  entries,
  counterpartyName = '',
  isManufacturer = false,
  canWrite = true,
  counterpartyIsSubscriber,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [page, setPage] = useState(1);
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

  const totalPages = Math.ceil(entries.length / PER_PAGE) || 1;
  const validPage = Math.min(Math.max(1, page), totalPages);
  const visibleEntries = entries.slice((validPage - 1) * PER_PAGE, validPage * PER_PAGE);

  return (
    <>
      <div className="w-full">
        {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — 10'lu Sayfalama */}
        <div className="space-y-3 md:hidden">
          {visibleEntries.map((e) => {
            const showInLeftBorc = isManufacturer ? e.type === 'credit' : e.type === 'debit';
            const showInRightAlacak = isManufacturer ? e.type === 'debit' : e.type === 'credit';
            const isExpanded = expandedId === e.id;
            const hasDetails = (e.itemsSnapshot && e.itemsSnapshot.length > 0) || !!e.orderId;
            const isManual = !e.orderId;

            return (
              <div
                key={e.id}
                className={`rounded-2xl border bg-white p-4 shadow-xs transition-shadow hover:shadow-md ${
                  isExpanded ? 'border-brand-500 ring-1 ring-brand-500/20' : 'border-slate-200/90'
                }`}
              >
                {/* Kart Üst Bilgisi: Tarih + Bakiye */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {formatDate(e.createdAt)}
                    </span>
                    {e.orderNo && (
                      <span className="ml-2 font-mono text-[11px] font-extrabold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                        #{e.orderNo}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Bakiye
                    </span>
                    <span className="font-mono text-xs font-black text-slate-900">
                      {formatMoney(e.balanceAfter)}
                    </span>
                  </div>
                </div>

                {/* Açıklama */}
                <div className="py-2.5">
                  <p className="text-xs font-bold text-slate-800 leading-snug">
                    {e.description}
                  </p>
                </div>

                {/* Borç / Alacak Izgarası */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-red-600">
                      {labels.debit}
                    </span>
                    <span className="font-mono text-sm font-black text-red-600 block mt-0.5">
                      {showInLeftBorc ? formatMoney(e.amount) : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      {labels.credit}
                    </span>
                    <span className="font-mono text-sm font-black text-emerald-600 block mt-0.5">
                      {showInRightAlacak ? formatMoney(e.amount) : '—'}
                    </span>
                  </div>
                </div>

                {/* Kart Aksiyonları */}
                <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-100">
                  {hasDetails ? (
                    <button
                      type="button"
                      onClick={() => toggleExpand(e.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Detayı Gizle' : 'Kalem Detayını Gör'}</span>
                      <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                    </button>
                  ) : isManual && canWrite ? (
                    <button
                      type="button"
                      onClick={() => setEditingEntry(e)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Düzenle</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">Otomatik Hareket</span>
                  )}
                </div>

                {/* Genişletilmiş Sipariş / Kalem Detayı */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 bg-slate-50/60 rounded-xl p-3">
                    <LedgerEntryDetail entry={e} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Mobilde Önceki / Sonraki Sayfa Butonları (Yan Yana Sabit Düzen) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/80 bg-slate-50/50 p-2.5 sm:p-3 rounded-xl flex-nowrap">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              >
                ← Önceki
              </button>

              <span className="text-xs font-bold text-slate-700 font-mono px-2 py-1 bg-white border border-slate-200/70 rounded-lg shadow-2xs shrink-0 tabular-nums">
                {validPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              >
                Sonraki →
              </button>
            </div>
          )}
        </div>

        {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: 6 Sütunlu Geniş Tablo (md ve üzeri) */}
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
                      <td className={`${TD} text-slate-700 font-medium max-w-[240px]`}>
                        <div className="flex min-w-0 items-center gap-1.5">
                          {hasDetails && (
                            <span className="shrink-0 text-slate-400 text-xs">{isExpanded ? '▾' : '▸'}</span>
                          )}
                          <span className="truncate" title={e.description}>{e.description}</span>
                        </div>
                      </td>
                      <td className={`${TD} text-right font-semibold text-red-600 whitespace-nowrap`}>
                        {showInLeftBorc ? formatMoney(e.amount) : '—'}
                      </td>
                      <td className={`${TD} text-right font-semibold text-emerald-600 whitespace-nowrap`}>
                        {showInRightAlacak ? formatMoney(e.amount) : '—'}
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
                              toggleExpand(e.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
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
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingEntry && (
        <EditManualTransactionDialog
          entry={editingEntry}
          counterpartyName={counterpartyName}
          isManufacturer={isManufacturer}
          counterpartyIsSubscriber={counterpartyIsSubscriber}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </>
  );
}
