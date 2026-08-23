import { Button } from '@/components/ui/Button';
import {
  EMPTY_FILTERS,
  hasActiveFilter,
  isRangeInverted,
  type ServiceFilters,
} from '../domain/filters';

interface Props {
  filters: ServiceFilters;
  /** [değer, etiket] — SSH ve iade farklı durum kümeleri kullanır. */
  statusOptions: [string, string][];
  /** [orgId, firma adı] — kullanıcının karşı tarafları. */
  partyOptions: [string, string][];
  onChange: (next: ServiceFilters) => void;
}

export function ServiceFilterBar({ filters, statusOptions, partyOptions, onChange }: Props) {
  const set = (patch: Partial<ServiceFilters>) => onChange({ ...filters, ...patch });
  const inverted = isRangeInverted(filters);

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[9rem]">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
            Durum
          </span>
          <select
            className="input w-full text-xs font-semibold"
            value={filters.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            <option value="all">Tümü</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex-1 min-w-[10rem]">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
            Karşı taraf
          </span>
          <select
            className="input w-full text-xs font-semibold"
            value={filters.partyOrgId}
            onChange={(e) => set({ partyOrgId: e.target.value })}
          >
            <option value="all">Tümü</option>
            {partyOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-[8.5rem]">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
            Başlangıç
          </span>
          <input
            type="date"
            className="input w-full text-xs font-semibold"
            value={filters.from}
            onChange={(e) => set({ from: e.target.value })}
          />
        </label>

        <label className="min-w-[8.5rem]">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
            Bitiş
          </span>
          <input
            type="date"
            className="input w-full text-xs font-semibold"
            value={filters.to}
            onChange={(e) => set({ to: e.target.value })}
          />
        </label>

        {hasActiveFilter(filters) && (
          <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
            Temizle
          </Button>
        )}
      </div>

      {inverted && (
        <p role="alert" className="text-xs font-bold text-red-600">
          ⚠️ Başlangıç tarihi bitişten sonra — bu aralıkta hiçbir kayıt bulunamaz.
        </p>
      )}
    </div>
  );
}
