import { SUBSCRIBER_FILTERS, type SubscriberFilter } from '../domain/filters';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  filter: SubscriberFilter;
  onFilterChange: (value: SubscriberFilter) => void;
  total: number;
}

export function OrgToolbar({ search, onSearchChange, filter, onFilterChange, total }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex rounded-lg bg-slate-100 p-1">
        {SUBSCRIBER_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onFilterChange(tab.id)}
            aria-pressed={filter === tab.id}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">{total} kayıt yüklendi</span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Firma adı veya VKN"
          aria-label="Firma adı veya VKN ile ara"
          className="input w-56"
        />
      </div>
    </div>
  );
}
