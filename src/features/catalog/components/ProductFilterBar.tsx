import type { ProductGroup } from '../api/useProductGroups';
import type { StockFilter } from '../domain/productStats';

interface Props {
  search: string;
  groupFilter: string;
  stockFilter: StockFilter;
  groups: ProductGroup[];
  onSearch: (v: string) => void;
  onGroupFilter: (v: string) => void;
  onStockFilter: (v: StockFilter) => void;
}

export function ProductFilterBar({
  search,
  groupFilter,
  stockFilter,
  groups,
  onSearch,
  onGroupFilter,
  onStockFilter,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:flex-row">
      <div className="relative w-full flex-grow rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-300 md:w-auto">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Ürün adı, grup veya kod ara..."
          aria-label="Ürün ara"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="block w-full border-none bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
      </div>

      <div className="flex w-full gap-2.5 md:w-auto">
        <select
          aria-label="Grup filtresi"
          value={groupFilter}
          onChange={(e) => onGroupFilter(e.target.value)}
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 transition-all hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 md:w-44"
        >
          <option value="">Tüm Gruplar</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
          {/* Gruplanmamışlar ayrı bir seçenek: "Tüm Gruplar" ile karışmasın. */}
          <option value="yok">Gruplanmamış</option>
        </select>

        <select
          aria-label="Stok durumu filtresi"
          value={stockFilter}
          onChange={(e) => onStockFilter(e.target.value as StockFilter)}
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 transition-all hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 md:w-40"
        >
          <option value="all">Stok Durumu</option>
          <option value="high">Yüksek Stok</option>
          <option value="low">Düşük Stok</option>
        </select>
      </div>
    </div>
  );
}
