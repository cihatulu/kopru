interface Props {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const BTN =
  'rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors';

/**
 * Önceki/sonraki sayfa düğmeleri.
 *
 * Toplam sayfa sayısı GÖSTERİLMEZ: liste keyset ile ilerliyor (A17), toplamı
 * bilmek için ayrıca sayım sorgusu gerekirdi.
 */
export function Pager({ page, hasPrev, hasNext, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-center gap-4 pt-4">
      <button type="button" disabled={!hasPrev} onClick={onPrev} className={BTN}>
        ← Önceki
      </button>
      <span className="text-xs font-bold text-slate-500">Sayfa {page}</span>
      <button type="button" disabled={!hasNext} onClick={onNext} className={BTN}>
        Sonraki →
      </button>
    </div>
  );
}
