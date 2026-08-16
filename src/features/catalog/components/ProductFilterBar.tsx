import { SearchInput } from '@/components/ui/SearchInput';
import type { ProductGroup } from '../api/useProductGroups';
import type { StockFilter } from '../domain/productStats';

interface Props {
  search: string;
  groupFilter: string;
  categoryFilter: string;
  /** Ürünlerde geçen kategoriler. */
  categories: string[];
  stockFilter: StockFilter;
  groups: ProductGroup[];
  onSearch: (v: string) => void;
  onGroupFilter: (v: string) => void;
  onCategoryFilter: (v: string) => void;
  onStockFilter: (v: StockFilter) => void;
}

/*
  Arama kutusu kendi kabuğunu kuruyordu (ayrı çerçeve, ayrı odak halkası,
  şeffaf girdi) ve üç seçici de aynı uzun sınıf dizisini elle tekrarlıyordu.
  Şimdi ortak `SearchInput` ve `.select` — dördü de 36px, aynı odak halkası.
*/
export function ProductFilterBar({
  search,
  groupFilter,
  categoryFilter,
  categories,
  stockFilter,
  groups,
  onSearch,
  onGroupFilter,
  onCategoryFilter,
  onStockFilter,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <SearchInput
          value={search}
          placeholder="Ürün adı, grup veya kod ara..."
          onChange={onSearch}
        />
      </div>

      <div className="flex w-full gap-2 md:w-auto">
        <select
          aria-label="Grup filtresi"
          value={groupFilter}
          onChange={(e) => onGroupFilter(e.target.value)}
          className="select w-full md:w-44"
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
          aria-label="Kategori filtresi"
          value={categoryFilter}
          onChange={(e) => onCategoryFilter(e.target.value)}
          className="select w-full md:w-44"
        >
          <option value="">Tüm Kategoriler</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          aria-label="Stok durumu filtresi"
          value={stockFilter}
          onChange={(e) => onStockFilter(e.target.value as StockFilter)}
          className="select w-full md:w-40"
        >
          <option value="all">Stok Durumu</option>
          <option value="high">Yüksek Stok</option>
          <option value="low">Düşük Stok</option>
        </select>
      </div>
    </div>
  );
}
