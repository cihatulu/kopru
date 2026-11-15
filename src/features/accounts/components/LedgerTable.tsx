import { useMemo, useState } from 'react';
import { columnLabels } from '../domain/accountView';
import {
  entryState,
  isEditableEntry,
  reversedIds,
  type LedgerEntry,
} from '../domain/ledgerEntry';
import { EditManualTransactionDialog } from './EditManualTransactionDialog';
import { LedgerCards } from './LedgerCards';
import { LedgerDesktopTable } from './LedgerDesktopTable';

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
 *
 * Bu bileşen yalnız durumu tutar (açık satır, düzenlenen kayıt, sayfa); iki
 * görünüm `LedgerCards` ve `LedgerDesktopTable` içindedir.
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
  const reversed = useMemo(() => reversedIds(entries), [entries]);

  if (entries.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Bu hesapta henüz hareket yok.
      </p>
    );
  }

  const totalPages = Math.ceil(entries.length / PER_PAGE) || 1;
  const validPage = Math.min(Math.max(1, page), totalPages);

  const rows = {
    isManufacturer,
    labels: columnLabels(isManufacturer),
    expandedId,
    stateOf: (e: LedgerEntry) => entryState(e, reversed),
    // İptal edilmiş kayıt ve iptal satırının kendisi düzeltilemez.
    canEdit: (e: LedgerEntry) => canWrite && isEditableEntry(e, reversed),
    onToggle: (id: string) => setExpandedId(expandedId === id ? null : id),
    onEdit: setEditingEntry,
  };

  return (
    <>
      <div className="w-full">
        <LedgerCards
          {...rows}
          entries={entries.slice((validPage - 1) * PER_PAGE, validPage * PER_PAGE)}
          page={validPage}
          totalPages={totalPages}
          onPage={setPage}
        />
        <LedgerDesktopTable {...rows} entries={entries} />
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
