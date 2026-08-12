import { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { SshOrderCard } from './SshOrderCard';
import type { SshEligibleOrder } from '../api/useSshEligibleOrders';

interface Props {
  orders: SshEligibleOrder[];
  loading: boolean;
  onSelect: (order: SshEligibleOrder) => void;
  onManual: () => void;
}

/** Adım 1 — talebin bağlanacağı sipariş seçilir ya da siparişsiz devam edilir. */
export function SshOrderPicker({ orders, loading, onSelect, onManual }: Props) {
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.manufacturerName.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q)),
    );
  }, [orders, term]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Sipariş Ara</label>
        <input
          type="text"
          placeholder="Sipariş no, tedarikçi adı veya ürün adı ile ara..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Siparişleriniz ({filtered.length})
            </p>
            <button
              type="button"
              onClick={onManual}
              className="text-blue-600 hover:text-blue-700 font-bold text-xs hover:underline cursor-pointer"
            >
              + Siparişsiz Manuel Talep Oluştur
            </button>
          </div>

          {filtered.map((order) => (
            <SshOrderCard key={order.id} order={order} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed space-y-3">
          <p className="text-xs text-slate-500 font-medium">Sipariş bulunamadı.</p>
          <Button onClick={onManual} size="sm" className="bg-blue-600 text-white font-bold">
            Siparişsiz Manuel SSH Talebi Oluştur
          </Button>
        </div>
      )}
    </div>
  );
}
