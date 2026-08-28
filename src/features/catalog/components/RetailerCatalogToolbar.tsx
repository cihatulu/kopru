import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { ACTIVITY_LABEL, type ActivityFilter } from '../domain/productStats';

interface Props {
  activity: ActivityFilter;
  onActivityChange: (v: ActivityFilter) => void;
  onManageGroups: () => void;
  onCreateSet: () => void;
  onAddProduct: () => void;
}

const ACTIVITY_OPTIONS = [
  { value: 'active', label: ACTIVITY_LABEL.active },
  { value: 'passive', label: ACTIVITY_LABEL.passive },
] as const;

/** Perakendecinin misafir üretici kataloğu üzerindeki eylemleri. */
export function RetailerCatalogToolbar({
  activity,
  onActivityChange,
  onManageGroups,
  onCreateSet,
  onAddProduct,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
      <Segmented
        label="Ürün durumu"
        options={ACTIVITY_OPTIONS}
        value={activity}
        onChange={onActivityChange}
        fullWidth
        className="w-full sm:w-auto"
      />
      <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full sm:w-auto">
        <Button variant="secondary" size="sm" onClick={onManageGroups} className="w-full sm:w-auto text-xs font-semibold">
          Gruplar
        </Button>
        <Button variant="secondary" size="sm" onClick={onCreateSet} className="w-full sm:w-auto text-xs font-semibold">
          Set Oluştur
        </Button>
        <Button variant="primary" size="sm" onClick={onAddProduct} className="w-full sm:w-auto text-xs font-bold">
          Yeni Ürün
        </Button>
      </div>
    </div>
  );
}
