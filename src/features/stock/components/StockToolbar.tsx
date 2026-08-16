import { useState } from 'react';
import { SearchInput } from '@/components/ui/SearchInput';
import { IconButton } from '@/components/ui/IconButton';

interface Props {
  search: string;
  categories: string[];
  selectedCategory: string | null;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string | null) => void;
  onReset: () => void;
}

/*
  Kategori çipleri: seçili olan marka rengiyle dolar, diğerleri nötr.
  Eskiden "Tümü" siyah, seçili kategori mavi doluyordu — iki farklı
  "seçili" rengi vardı ve hangisinin aktif olduğu okunmuyordu.
*/
const CHIP =
  'inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold transition-colors cursor-pointer';
const CHIP_OFF = 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
const CHIP_ON = 'border-brand-600 bg-brand-600 text-white';

/** Stok listesi arama + kategori süzme çubuğu. */
export function StockToolbar({
  search,
  categories,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
  onReset,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-center gap-2">
        {/* Arama kutusu çerçevesizdi ve nerede yazılacağı belli değildi. */}
        <div className="min-w-0 flex-1">
          <SearchInput
            value={search}
            placeholder="Ürün adı, model veya kod ara..."
            onChange={onSearchChange}
          />
        </div>

        <IconButton
          label="Kategoriye göre filtrele"
          size="md"
          onClick={() => setFilterOpen((v) => !v)}
          className={filterOpen ? 'bg-brand-50 text-brand-600' : ''}
        >
          <path d="M4 6h16M7 12h10M10 18h4" />
        </IconButton>

        <IconButton label="Süzgeçleri temizle" size="md" onClick={onReset}>
          <path d="M20 11A8.1 8.1 0 004.5 9M4 5v4h4M4 13a8.1 8.1 0 0015.5 2M20 19v-4h-4" />
        </IconButton>
      </div>

      {filterOpen && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Kategoriye göre filtrele
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={selectedCategory === null}
              onClick={() => onCategoryChange(null)}
              className={`${CHIP} ${selectedCategory === null ? CHIP_ON : CHIP_OFF}`}
            >
              Tümü
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={selectedCategory === cat}
                onClick={() => onCategoryChange(cat === selectedCategory ? null : cat)}
                className={`${CHIP} ${selectedCategory === cat ? CHIP_ON : CHIP_OFF}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
