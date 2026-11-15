import { formatDate, formatMoney } from '@/lib/format';
import { LedgerEntryDetail } from './LedgerEntryDetail';
import { ledgerRowView } from '../domain/ledgerEntry';
import { ReversedBadge, type LedgerRowsProps } from './LedgerRowParts';

const PAGER_BUTTON =
  'px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors shrink-0 whitespace-nowrap cursor-pointer';

interface Props extends LedgerRowsProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

/** 📱 Mobil görünüm: Akıllı Kartlar — 10'lu sayfalama. */
export function LedgerCards({
  entries,
  isManufacturer,
  labels,
  expandedId,
  stateOf,
  canEdit,
  onToggle,
  onEdit,
  page,
  totalPages,
  onPage,
}: Props) {
  return (
    <div className="space-y-3 md:hidden">
      {entries.map((e) => {
        const { showDebit, showCredit, hasDetails } = ledgerRowView(e, isManufacturer);
        const isExpanded = expandedId === e.id;

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
            <div className="flex items-start gap-2 py-2.5">
              <p className="text-xs font-bold text-slate-800 leading-snug">{e.description}</p>
              <ReversedBadge state={stateOf(e)} />
            </div>

            {/* Borç / Alacak Izgarası */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-red-600">
                  {labels.debit}
                </span>
                <span className="font-mono text-sm font-black text-red-600 block mt-0.5">
                  {showDebit ? formatMoney(e.amount) : '—'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  {labels.credit}
                </span>
                <span className="font-mono text-sm font-black text-emerald-600 block mt-0.5">
                  {showCredit ? formatMoney(e.amount) : '—'}
                </span>
              </div>
            </div>

            {/* Kart Aksiyonları */}
            <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-100">
              {hasDetails ? (
                <button
                  type="button"
                  onClick={() => onToggle(e.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                >
                  <span>{isExpanded ? 'Detayı Gizle' : 'Kalem Detayını Gör'}</span>
                  <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                </button>
              ) : canEdit(e) ? (
                <button
                  type="button"
                  onClick={() => onEdit(e)}
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
            disabled={page <= 1}
            onClick={() => onPage(Math.max(1, page - 1))}
            className={PAGER_BUTTON}
          >
            ← Önceki
          </button>

          <span className="text-xs font-bold text-slate-700 font-mono px-2 py-1 bg-white border border-slate-200/70 rounded-lg shadow-2xs shrink-0 tabular-nums">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPage(Math.min(totalPages, page + 1))}
            className={PAGER_BUTTON}
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}
