import { useState } from 'react';
import { formatMoney } from '@/lib/format';

interface Props {
  productId: string;
  /** KATMAN 3 — yalnız bu perakendeciye görünür (A4). Belirlenmemişse undefined. */
  retailPrice: number | undefined;
  onSave: (productId: string, price: number) => void;
}

const ICON = 'size-5';

/** Perakendecinin kendi satış fiyatını satır içinde düzenlediği hücre. */
export function RetailPriceCell({ productId, retailPrice, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(retailPrice?.toString() ?? '');

  const cancel = () => {
    setEditing(false);
    setDraft(retailPrice?.toString() ?? '');
  };

  const save = () => {
    // Virgüllü giriş de kabul edilir; Türkçe klavyede ondalık ayracı virgüldür.
    const value = parseFloat(draft.replace(',', '.'));
    if (!isNaN(value) && value >= 0) onSave(productId, value);
    setEditing(false);
  };

  return (
    <td className="whitespace-nowrap px-4 py-4 text-sm font-extrabold text-brand-600">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            aria-label="Perakende satış fiyatı"
            className="w-24 rounded border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-brand-500 focus:ring-brand-500"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') cancel();
            }}
            autoFocus
          />
          <button
            type="button"
            aria-label="Kaydet"
            onClick={save}
            className="text-emerald-600 hover:text-emerald-700"
          >
            <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Vazgeç"
            onClick={cancel}
            className="text-slate-400 hover:text-slate-500"
          >
            <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="group flex items-center gap-2">
          <span>{retailPrice === undefined ? 'Belirlenmedi' : formatMoney(retailPrice)}</span>
          <button
            type="button"
            aria-label="Perakende fiyatını düzenle"
            onClick={() => {
              setDraft(retailPrice?.toString() ?? '');
              setEditing(true);
            }}
            className="text-slate-400 opacity-0 transition-opacity hover:text-brand-600 group-hover:opacity-100"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      )}
    </td>
  );
}
