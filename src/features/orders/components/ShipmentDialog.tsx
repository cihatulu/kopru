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
  const shippedTotal = order.items.reduce(
    (sum, i) => sum + i.supplierUnitPrice * (quantities[i.id] ?? 0),
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

      <ul className="space-y-3">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{i.name}</p>
              <p className="text-xs text-slate-500">
                Sipariş: {formatQuantity(i.quantity)} · {formatMoney(i.supplierUnitPrice)}
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
              className="input w-24 py-1.5 text-sm"
            />
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-200 pt-3">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Açıklama / Not <span className="font-normal normal-case text-slate-400">(Opsiyonel)</span>
        </label>
        <textarea
          className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-all outline-none min-h-[80px]"
          rows={3}
          placeholder="Sevkiyat ile ilgili açıklama yazın..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
        <span className="text-slate-500">Bu sevkiyatın tutarı</span>
        <span className="font-bold text-slate-900">{formatMoney(shippedTotal)}</span>
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
