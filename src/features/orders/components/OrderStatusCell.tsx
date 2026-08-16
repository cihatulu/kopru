import { Button } from '@/components/ui/Button';
import type { OrderStatus } from '../domain/status';

interface Props {
  status: OrderStatus;
  /** Seçim yapılmadıysa undefined — buton bu yüzden pasif kalır. */
  selected: OrderStatus | undefined;
  pending: boolean;
  /** Kısmi sevk yalnız KÖK siparişten yapılır; çocuk siparişte gösterilmez. */
  isRoot: boolean;
  onSelect: (status: OrderStatus) => void;
  onUpdate: (status: OrderStatus) => void;
  onPartialShip: () => void;
}

/**
 * `confirmed`, kullanıcıya `pending` olarak gösterilir: onay adımı arayüzde
 * ayrı bir durum değil. Karşılaştırmaların tabanı da bu yüzden buradan gelir.
 */
const baselineOf = (status: OrderStatus): OrderStatus =>
  status === 'confirmed' ? 'pending' : status;

export function OrderStatusCell({
  status,
  selected,
  pending,
  isRoot,
  onSelect,
  onUpdate,
  onPartialShip,
}: Props) {
  const baseline = baselineOf(status);
  const changed = selected !== undefined && selected !== baseline;
  const inProgress = status === 'in_production' || status === 'partially_shipped';

  return (
    <div className="flex flex-col gap-1.5 max-w-[200px]">
      <div className="flex items-center gap-2">
        {/* Seçici ve düğme 32px — satırdaki diğer eylemlerle aynı çizgi. */}
        <select
          aria-label="Sipariş durumu"
          value={selected ?? baseline}
          onChange={(e) => onSelect(e.target.value as OrderStatus)}
          className="select h-8 text-xs"
        >
          {(status === 'pending' || status === 'confirmed') && (
            <>
              <option value="pending">Bekliyor</option>
              <option value="in_production">Üretiliyor</option>
              <option value="cancelled">İptal Edildi</option>
            </>
          )}
          {inProgress && (
            <>
              <option value="pending" disabled>Bekliyor</option>
              <option value="in_production">Üretiliyor</option>
              <option value="shipped">Sevkiyatta</option>
              <option value="cancelled">İptal Edildi</option>
            </>
          )}
          {status === 'shipped' && (
            <>
              <option value="shipped">Sevkiyatta</option>
              <option value="cancelled">İptal Edildi</option>
            </>
          )}
        </select>
        {/*
          Seçim değişmeden "Güncelle" birincil renge dönmez. Değişiklik
          olmadan basılacak bir düğmeyi vurgulamak, kullanıcıyı boş bir
          isteğe çağırmak olurdu.
        */}
        <Button
          size="sm"
          variant={changed ? 'primary' : 'secondary'}
          disabled={pending || !changed}
          loading={pending}
          onClick={() => {
            if (selected) onUpdate(selected);
          }}
        >
          Güncelle
        </Button>
      </div>

      {inProgress && isRoot && (
        <Button variant="secondary" size="sm" className="w-full" onClick={onPartialShip}>
          Kısmi Sevk Et
        </Button>
      )}
    </div>
  );
}
