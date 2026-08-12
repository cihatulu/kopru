import { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ServiceOrderCard } from './ServiceOrderCard';
import type { ServiceOrder } from '../api/useServiceOrders';

interface Props {
  orders: ServiceOrder[];
  loading: boolean;
  accent: 'blue' | 'rose';
  showQuota: boolean;
  listLabel: string;
  emptyText: string;
  onSelect: (order: ServiceOrder) => void;
  /** SSH akışında siparişsiz talep açılabilir; iadede sipariş zorunludur. */
  manual?: { label: string; onSelect: () => void } | undefined;
}

/** Servis akışlarının ilk adımı — talebin bağlanacağı sipariş aranır ve seçilir. */
export function ServiceOrderPicker({
  orders,
  loading,
  accent,
  showQuota,
  listLabel,
  emptyText,
  onSelect,
  manual,
}: Props) {
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.manufacturerName.toLowerCase().includes(q) ||
        o.items.some(
          (i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q),
        ),
    );
  }, [orders, term]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const ring = accent === 'blue' ? 'focus:ring-blue-500/20 focus:border-blue-400' : 'focus:ring-rose-500/20 focus:border-rose-400';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Sipariş Ara</label>
        <input
          type="text"
          placeholder="Sipariş no, tedarikçi adı veya ürün adı ile ara..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 ${ring}`}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {listLabel} ({filtered.length})
            </p>
            {manual && (
              <button
                type="button"
                onClick={manual.onSelect}
                className="text-blue-600 hover:text-blue-700 font-bold text-xs hover:underline cursor-pointer"
              >
                {manual.label}
              </button>
            )}
          </div>

          {filtered.map((order) => (
            <ServiceOrderCard
              key={order.id}
              order={order}
              accent={accent}
              showQuota={showQuota}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed space-y-3">
          <p className="text-xs text-slate-500 font-medium">{emptyText}</p>
          {manual && (
            <Button onClick={manual.onSelect} size="sm" className="bg-blue-600 text-white font-bold">
              {manual.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
