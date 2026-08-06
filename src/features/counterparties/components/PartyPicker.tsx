import { otherParty, type Edge } from '../domain/counterparty';

interface Props {
  edges: Edge[];
  myOrgId: string;
  selectedId: string | null | undefined;
  onSelect: (edge: Edge) => void;
  /** İskonto oranını rozette göster (katalog ekranında anlamlı). */
  showDiscount?: boolean;
  emptyText: string;
}

/** Aktif ticari ilişkiler arasından karşı taraf seçici. */
export function PartyPicker({
  edges,
  myOrgId,
  selectedId,
  onSelect,
  showDiscount,
  emptyText,
}: Props) {
  if (edges.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {edges.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onSelect(e)}
          aria-pressed={selectedId === e.id}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
            selectedId === e.id
              ? 'bg-brand-600 text-white ring-brand-600'
              : 'bg-white text-slate-700 ring-slate-200 hover:ring-brand-500'
          }`}
        >
          {otherParty(e, myOrgId).companyName}
          {showDiscount && e.discountRate > 0 && ` · %${e.discountRate}`}
        </button>
      ))}
    </div>
  );
}
