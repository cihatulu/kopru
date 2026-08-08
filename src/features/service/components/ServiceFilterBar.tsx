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
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[9rem]">
          <span className="label">Durum</span>
          <select
            className="input"
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
          <span className="label">Karşı taraf</span>
          <select
            className="input"
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
          <span className="label">Başlangıç</span>
          <input
            type="date"
            className="input"
            value={filters.from}
            onChange={(e) => set({ from: e.target.value })}
          />
        </label>

        <label className="min-w-[8.5rem]">
          <span className="label">Bitiş</span>
          <input
            type="date"
            className="input"
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
        <p role="alert" className="text-xs text-red-600">
          Başlangıç tarihi bitişten sonra — bu aralıkta hiçbir kayıt bulunamaz.
        </p>
      )}
    </div>
  );
}
