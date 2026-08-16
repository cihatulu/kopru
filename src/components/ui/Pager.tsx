import { Button } from './Button';

interface Props {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Önceki/sonraki sayfa düğmeleri.
 *
 * Toplam sayfa sayısı GÖSTERİLMEZ: liste keyset ile ilerliyor (A17), toplamı
 * bilmek için ayrıca sayım sorgusu gerekirdi.
 */
export function Pager({ page, hasPrev, hasNext, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-center gap-4 pt-4">
      <Button variant="secondary" size="sm" disabled={!hasPrev} onClick={onPrev}>
        ← Önceki
      </Button>
      <span className="text-xs font-semibold tabular-nums text-slate-500">Sayfa {page}</span>
      <Button variant="secondary" size="sm" disabled={!hasNext} onClick={onNext}>
        Sonraki →
      </Button>
    </div>
  );
}
