import { Button } from '@/components/ui/Button';
import { ORG_KIND, type OrgKind } from '@/constants';
import { SUBSCRIBER_FILTERS, type SubscriberFilter } from '../domain/filters';

interface Props {
  kind: OrgKind;
  search: string;
  onSearchChange: (value: string) => void;
  filter: SubscriberFilter;
  onFilterChange: (value: SubscriberFilter) => void;
  total: number;
  onCreate: () => void;
}

const TITLES: Record<OrgKind, string> = {
  [ORG_KIND.manufacturer]: 'Üretici Yönet',
  [ORG_KIND.retailer]: 'Perakendeci Yönet',
};

export function OrgToolbar(props: Props) {
  const { kind, search, onSearchChange, filter, onFilterChange, total, onCreate } = props;
  const noun = kind === ORG_KIND.manufacturer ? 'Üretici' : 'Perakendeci';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{TITLES[kind]}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Abone ve misafir organizasyonlar aynı listede. Misafir bir kayıt tek tıkla aboneye
            yükseltilir; mevcut ticari ilişkileri korunur.
          </p>
        </div>
        <Button onClick={onCreate}>Yeni {noun.toLowerCase()}</Button>
      </div>

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
    </div>
  );
}
