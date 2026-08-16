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
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Segmented
        label="Ürün durumu"
        options={ACTIVITY_OPTIONS}
        value={activity}
        onChange={onActivityChange}
      />
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
