import { useState } from 'react';

interface Props {
  search: string;
  categories: string[];
  selectedCategory: string | null;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string | null) => void;
  onReset: () => void;
}

const CHIP = 'px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer';
const CHIP_OFF = 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100';

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
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Ürün adı, model veya kod ara..."
          aria-label="Ürün ara"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full max-w-lg flex-grow rounded-xl border-none bg-transparent px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
        <div className="flex items-center gap-1.5 border-l border-slate-100 pl-2 pr-1">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            className={`rounded-xl p-2 transition-colors cursor-pointer ${
              filterOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
            title="Filtrele"
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 cursor-pointer"
            title="Yenile"
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="mt-2 border-t border-slate-50 px-2 pb-1.5 pt-3 text-left">
          <p className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Kategoriye Göre Filtrele
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onCategoryChange(null)}
              className={`${CHIP} ${
                selectedCategory === null ? 'border-slate-900 bg-slate-900 text-white' : CHIP_OFF
              }`}
            >
              Tümü
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat === selectedCategory ? null : cat)}
                className={`${CHIP} ${
                  selectedCategory === cat ? 'border-blue-600 bg-blue-600 text-white' : CHIP_OFF
                }`}
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
