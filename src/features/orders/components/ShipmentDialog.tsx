import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatMoney, formatQuantity } from '@/lib/format';
import type { OrderDetail } from '../domain/orderMapping';

interface Props {
  order: OrderDetail;
  pending: boolean;
  errorMessage?: string | undefined;
  onClose: () => void;
  onShip: (items: { orderItemId: string; quantity: number }[] | null, note?: string) => void;
}

/**
 * Sevkiyat. Kalemlerin bir kısmı gönderilirse çocuk sipariş oluşur; kökte kalan
 * miktar durur. Cari defter DEĞİŞMEZ — borç sipariş anında tam tutardan yazıldı,
 * kök ve çocukların toplamı sabit kalır.
 */
export function ShipmentDialog({ order, pending, errorMessage, onClose, onShip }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.items.map((i) => [i.id, i.quantity])),
  );
  const [note, setNote] = useState('');

  const isFull = order.items.every((i) => (quantities[i.id] ?? 0) === i.quantity);
  const nothing = order.items.every((i) => (quantities[i.id] ?? 0) <= 0);
  
  const unitTotal = (i: (typeof order.items)[0]) => i.supplierUnitPrice + (i.priceDifference ?? 0);
  const shippedTotal = order.items.reduce(
    (sum, i) => sum + unitTotal(i) * (quantities[i.id] ?? 0),
    0,
  );

  return (
    <Modal
      label={'Sevkiyat'}
      panelClassName={
        'max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4'
      }
      onClose={onClose}
      closeDisabled={pending}
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900">Sevkiyat</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gönderilen miktarları girin. Eksik gönderirseniz kalan kısım siparişte bekler.
        </p>
      </div>

      <ul className="space-y-3 divide-y divide-slate-100">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 pt-2.5 first:pt-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{i.name}</p>
              {i.customDescription && (
                <p className="text-[10px] font-semibold text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 inline-block mt-0.5 border border-amber-200/60">
                  Talep: {i.customDescription}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                Sipariş: {formatQuantity(i.quantity)} · {formatMoney(i.supplierUnitPrice)}
                {i.priceDifference !== 0 && (
                  <span className={`font-bold ml-1 ${i.priceDifference > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ({i.priceDifference > 0 ? '+' : ''}{formatMoney(i.priceDifference)})
                  </span>
                )}
                {i.priceDifference !== 0 && (
                  <span className="font-bold text-slate-800 ml-1">
                    = {formatMoney(unitTotal(i))}
                  </span>
                )}
              </p>
            </div>
            <input
              type="number"
              min={0}
              max={i.quantity}
              step="1"
              value={quantities[i.id] ?? 0}
              onChange={(e) =>
                setQuantities((prev) => ({
                  ...prev,
                  [i.id]: Math.min(Math.max(Number(e.target.value), 0), i.quantity),
                }))
              }
              aria-label={`${i.name} sevk miktarı`}
              className="input w-24 py-1.5 text-sm font-bold text-center"
            />
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-200 pt-3">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Açıklama / Not <span className="font-normal normal-case text-slate-400">(Opsiyonel)</span>
        </label>
        <textarea
          className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none transition-all outline-none min-h-[80px]"
          rows={3}
          placeholder="Sevkiyat ile ilgili açıklama yazın..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
        <span className="text-slate-500 font-medium">Bu sevkiyatın tutarı</span>
        <span className="font-extrabold text-slate-900 text-base">{formatMoney(shippedTotal)}</span>
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        {isFull
          ? 'Tüm kalemler gönderiliyor; sipariş kapanacak.'
          : 'Kısmi sevkiyat: yeni bir sevk kaydı oluşur, kalan miktar siparişte kalır. Cari borç değişmez.'}
      </p>

      {errorMessage && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Vazgeç
        </Button>
        <Button
          loading={pending}
          disabled={nothing}
          onClick={() =>
            onShip(
              isFull
                ? null
                : order.items
                    .filter((i) => (quantities[i.id] ?? 0) > 0)
                    .map((i) => ({ orderItemId: i.id, quantity: quantities[i.id] ?? 0 })),
              note.trim() || undefined,
            )
          }
        >
          {isFull ? 'Tamamını sevk et' : 'Kısmi sevk et'}
        </Button>
      </div>
    </Modal>
  );
}
