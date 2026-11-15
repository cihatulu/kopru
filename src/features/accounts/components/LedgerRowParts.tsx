import type { LedgerEntry, LedgerEntryState } from '../domain/ledgerEntry';

/** Mobil kart ve masaüstü satırın ortak girdileri. */
export interface LedgerRowsProps {
  entries: LedgerEntry[];
  isManufacturer: boolean;
  labels: { debit: string; credit: string };
  expandedId: string | null;
  stateOf: (e: LedgerEntry) => LedgerEntryState;
  canEdit: (e: LedgerEntry) => boolean;
  onToggle: (id: string) => void;
  onEdit: (e: LedgerEntry) => void;
}

/**
 * İptal edilmiş kaydın etiketi. Kayıt defterden silinmez (kural 7); neden
 * artık geçerli olmadığı burada görünür.
 */
export function ReversedBadge({ state }: { state: LedgerEntryState }) {
  if (state !== 'reversed') return null;
  return (
    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      İptal edildi
    </span>
  );
}
