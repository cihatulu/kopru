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
        <select
          value={selected ?? baseline}
          onChange={(e) => onSelect(e.target.value as OrderStatus)}
          className="text-xs border border-slate-200 rounded-xl py-1.5 pl-3 pr-8 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shadow-sm"
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
        <button
          type="button"
          disabled={pending || !changed}
          onClick={() => {
            if (selected) onUpdate(selected);
          }}
          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${
            changed
              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-sm cursor-pointer'
              : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
          }`}
        >
          Güncelle
        </button>
      </div>

      {inProgress && isRoot && (
        <button
          type="button"
          onClick={onPartialShip}
          className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-colors shadow-sm w-full uppercase tracking-wider cursor-pointer font-sans"
        >
          Kısmi Sevk Et
        </button>
      )}
    </div>
  );
}
