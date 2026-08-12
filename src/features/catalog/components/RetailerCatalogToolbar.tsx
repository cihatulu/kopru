import { Button } from '@/components/ui/Button';
import { ACTIVITY_LABEL, type ActivityFilter } from '../domain/productStats';

interface Props {
  activity: ActivityFilter;
  onActivityChange: (v: ActivityFilter) => void;
  onManageGroups: () => void;
  onCreateSet: () => void;
  onAddProduct: () => void;
}

const FILTERS: ActivityFilter[] = ['active', 'passive'];

/** Perakendecinin misafir üretici kataloğu üzerindeki eylemleri. */
export function RetailerCatalogToolbar({
  activity,
  onActivityChange,
  onManageGroups,
  onCreateSet,
  onAddProduct,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 shadow-inner">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onActivityChange(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activity === f
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {ACTIVITY_LABEL[f]}
          </button>
        ))}
      </div>
      <Button variant="secondary" onClick={onManageGroups}>
        Gruplar
      </Button>
      <Button variant="secondary" onClick={onCreateSet}>
        Set Oluştur
      </Button>
      <Button variant="primary" onClick={onAddProduct}>
        Yeni Ürün
      </Button>
    </div>
  );
}
