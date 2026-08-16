import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';

interface Props {
  showPassive: boolean;
  passiveCount: number;
  onTogglePassive: () => void;
  onAdd: () => void;
}

const VIEW_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'passive', label: 'Pasif' },
] as const;

/**
 * Müşteri Yönetimi başlığı ve aksiyonları.
 *
 * Aktif/pasif geçişi, üzerinde durum noktası ve sayaç taşıyan tek bir
 * düğmeydi; etiketi de duruma göre değişiyordu ("Aktif Müşteriler" ↔
 * "Pasif Müşterileri Gösteriyorsunuz"). Ne olduğu değil, ne olacağı
 * belirsizdi. İki seçenekli anahtara alındı — hangi listede olduğunuz
 * doğrudan okunuyor. Pasif sayısı ayrı bir rozette.
 */
export function CustomerHeader({ showPassive, passiveCount, onTogglePassive, onAdd }: Props) {
  return (
    <PageHeader
      title="Müşteri Yönetimi"
      description="Müşterilerinizi, bayilerinizi ve cari kartlarını buradan kolayca yönetebilirsiniz."
      actions={
        <>
          {passiveCount > 0 && !showPassive && (
            <Badge tone="neutral">{passiveCount} pasif</Badge>
          )}
          <Segmented
            label="Müşteri listesi"
            options={VIEW_OPTIONS}
            value={showPassive ? 'passive' : 'active'}
            onChange={(v) => {
              if ((v === 'passive') !== showPassive) onTogglePassive();
            }}
          />
          <Button onClick={onAdd}>Yeni Müşteri</Button>
        </>
      }
    />
  );
}
