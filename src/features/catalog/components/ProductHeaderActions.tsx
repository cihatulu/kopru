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
 * Başlık aksiyonları.
 *
 * Beş kontrol üç ayrı yükseklikteydi (36 / 44 / 44 ama farklı dolgu) ve
 * dördü kendi rengini seçmişti: koyu gri, beyaz, indigo, siyah. Şimdi
 * hepsi 36px ve TEK birincil eylem var — "Ürün Ekle". Gerisi yardımcı.
 *
 * "Ürün Ekle (4)" ve "Set Oluştur (1)" sayaçları düğmelerden alındı:
 * düğmenin dört ürün ekleyeceğini ima ediyorlardı ve aynı sayı hemen
 * altındaki "Toplam Ürün" kartında zaten yazıyor. "Gruba Ekle (0)"
 * sayacı KALDI — orada sayı seçili ürün adedi, yani eylemin kendisi.
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
        <>
          <Segmented
            label="Ürün durumu"
            options={ACTIVITY_OPTIONS}
            value={activity}
            onChange={onActivityChange}
          />

          {!isGuest && (
            <>
              <Button
                variant="secondary"
                onClick={onAssignGroup}
                disabled={selectedCount === 0}
                title={selectedCount === 0 ? 'Önce tablodan ürün seçin' : undefined}
              >
                Gruba Ekle ({selectedCount})
              </Button>
              <Button variant="secondary" onClick={onManageGroups}>
                Grupları Yönet{groups.length > 0 ? ` (${groups.length})` : ''}
              </Button>
              <Button
                variant="secondary"
                onClick={onCreateSet}
                disabled={!canCreateSet}
                title={canCreateSet ? undefined : 'Takım oluşturmak için en az 2 tek ürün seçin'}
              >
                Set Oluştur
              </Button>
              <Button onClick={onAddProduct}>Ürün Ekle</Button>
            </>
          )}
        </>
      }
    />
  );
}
