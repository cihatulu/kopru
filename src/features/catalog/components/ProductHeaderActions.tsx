import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import type { ProductGroup } from '../api/useProductGroups';
import { ACTIVITY_LABEL, type ActivityFilter } from '../domain/productStats';

interface Props {
  activity: ActivityFilter;
  onActivityChange: (v: ActivityFilter) => void;
  selectedCount: number;
  /** Seçilenlerden KAÇI tek ürün — set yalnız tek ürünlerden kurulur. */
  selectedSingleCount: number;
  groups: ProductGroup[];
  isGuest?: boolean;
  onAssignGroup: () => void;
  onManageGroups: () => void;
  onCreateSet: () => void;
  onAddProduct: () => void;
}

const ACTIVITY_OPTIONS = [
  { value: 'active', label: ACTIVITY_LABEL.active },
  { value: 'passive', label: ACTIVITY_LABEL.passive },
] as const;

/**
 * Başlık aksiyonları — Mobilde tam simetrik, eşit boyutlu 2 satırlı grid düzeni.
 */
export function ProductHeaderActions({
  activity,
  onActivityChange,
  selectedCount,
  selectedSingleCount,
  groups,
  isGuest = false,
  onAssignGroup,
  onManageGroups,
  onCreateSet,
  onAddProduct,
}: Props) {
  // Set en az iki TEK üründen kurulur; setin içine set koymak sonsuz döngüdür.
  const canCreateSet = selectedSingleCount >= 2;

  return (
    <PageHeader
      title="Ürün Yönetimi"
      description="Katalog ürünlerini, set takımlarını ve ürün gruplarını yönetin."
      actions={
        <div className="flex flex-col gap-2.5 w-full sm:w-auto">
          {/* 1. Satır: Mobilde Üstte Aktif/Pasif Tabları (Tam Genişlik), Masaüstünde Yan Yana */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <Segmented
              label="Ürün durumu"
              options={ACTIVITY_OPTIONS}
              value={activity}
              onChange={onActivityChange}
              fullWidth
              className="sm:w-auto"
            />

            {!isGuest && (
              <Button
                size="sm"
                onClick={onAddProduct}
                className="w-full sm:w-auto h-9 justify-center text-xs font-bold shrink-0"
              >
                + Ürün Ekle
              </Button>
            )}
          </div>

          {/* 2. Satır: Grup ve Set İşlemleri — Mobilde 3 Eşit Buton */}
          {!isGuest && (
            <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:items-center sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={onAssignGroup}
                disabled={selectedCount === 0}
                title={selectedCount === 0 ? 'Önce tablodan ürün seçin' : undefined}
                className="w-full sm:w-auto h-9 justify-center text-[11px] sm:text-xs px-2 text-center truncate font-semibold"
              >
                Gruba Ekle {selectedCount > 0 ? `(${selectedCount})` : ''}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onManageGroups}
                className="w-full sm:w-auto h-9 justify-center text-[11px] sm:text-xs px-2 text-center truncate font-semibold"
              >
                Gruplar{groups.length > 0 ? ` (${groups.length})` : ''}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onCreateSet}
                disabled={!canCreateSet}
                title={canCreateSet ? undefined : 'Takım oluşturmak için en az 2 tek ürün seçin'}
                className="w-full sm:w-auto h-9 justify-center text-[11px] sm:text-xs px-2 text-center truncate font-semibold"
              >
                Set Oluştur
              </Button>
            </div>
          )}
        </div>
      }
    />
  );
}
