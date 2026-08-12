import type { ProfitFilters } from '../domain/profitability';

const FIELD = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all';
const LABEL = 'block text-xs font-bold text-slate-500 mb-1.5';

interface Props {
  filters: ProfitFilters;
  categories: string[];
  retailers: { id: string; name: string }[];
  onChange: (filters: ProfitFilters) => void;
  onReset: () => void;
  onExport: () => void;
}

export function ProfitabilityFilters({
  filters,
  categories,
  retailers,
  onChange,
  onReset,
  onExport,
}: Props) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-3.5 items-end">
      <div className="w-full lg:flex-1">
        <label className={LABEL}>Ürün Ara</label>
        <input
          type="text"
          placeholder="Ürün adı veya kodu ile ara..."
          className={FIELD}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="w-full lg:w-1/4">
        <label className={LABEL}>Kategori</label>
        <select
          className={`${FIELD} bg-white`}
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          <option value="">Tümü</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="w-full lg:w-1/4">
        <label className={LABEL}>Perakendeci (Bayi)</label>
        <select
          className={`${FIELD} bg-white`}
          value={filters.retailerOrgId}
          onChange={(e) => onChange({ ...filters, retailerOrgId: e.target.value })}
        >
          <option value="">Tümü</option>
          {retailers.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full lg:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex-shrink-0"
      >
        Filtreleri Temizle
      </button>
      <button
        type="button"
        onClick={onExport}
        className="w-full lg:w-auto px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex-shrink-0 cursor-pointer"
      >
        Excel İndir
      </button>
    </div>
  );
}
