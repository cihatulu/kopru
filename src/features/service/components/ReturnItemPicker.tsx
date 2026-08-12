import { formatMoney } from '@/lib/format';
import type { ServiceOrderItem } from '../api/useServiceOrders';

const STEP_BTN =
  'w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer';

interface Props {
  items: ServiceOrderItem[];
  quantities: Record<string, number>;
  onChange: (orderItemId: string, quantity: number, max: number) => void;
}

/** İade edilecek kalemler ve adetleri; adet sipariş edilenden fazla olamaz. */
export function ReturnItemPicker({ items, quantities, onChange }: Props) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        İade Edilecek Ürünler ve Miktarları
      </label>

      {items.map((item) => {
        const qty = quantities[item.id] ?? 0;
        return (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-slate-200 flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 bg-white"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900">{item.name}</p>
              <p className="text-[11px] text-slate-400 font-mono">{item.code}</p>
              <p className="text-[11px] font-semibold text-emerald-600">
                {formatMoney(item.unitPrice)} / Adet
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(item.id, qty - 1, item.quantity)}
                className={STEP_BTN}
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max={item.quantity}
                value={qty}
                onChange={(e) => onChange(item.id, Number(e.target.value), item.quantity)}
                className="w-12 text-center text-xs font-bold border border-slate-200 rounded-lg py-1"
              />
              <button
                type="button"
                onClick={() => onChange(item.id, qty + 1, item.quantity)}
                className={STEP_BTN}
              >
                +
              </button>
              <span className="text-[11px] text-slate-400 ml-1">/ max {item.quantity}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
