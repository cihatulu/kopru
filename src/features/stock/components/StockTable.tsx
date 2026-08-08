import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { parseQuantity } from '../domain/csv';
import type { StockRow } from '../api/useStockList';

interface Props {
  rows: StockRow[];
  busyId: string | undefined;
  onSave: (productId: string, quantity: number) => void;
}

export function StockTable({ rows, busyId, onSave }: Props) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Ürün bulunamadı.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Ürün</th>
            <th className="px-4 py-3">Kod</th>
            <th className="px-4 py-3 text-right">Stok</th>
            <th className="px-4 py-3">Son güncelleme</th>
            <th className="px-4 py-3 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((r) => (
            <Row key={r.productId} row={r} busy={busyId === r.productId} onSave={onSave} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  busy,
  onSave,
}: {
  row: StockRow;
  busy: boolean;
  onSave: (productId: string, quantity: number) => void;
}) {
  const [value, setValue] = useState<string>(row.quantity === null ? '' : String(row.quantity));
  const [touched, setTouched] = useState(false);

  const parsed = parseQuantity(value);
  const invalid = touched && value.trim() !== '' && parsed === null;
  const changed = value.trim() !== '' && parsed !== null && parsed !== row.quantity;

  return (
    <tr className="text-slate-700">
      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
      <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.code || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <input
            className={`input w-28 py-1 text-right ${invalid ? 'ring-red-400' : ''}`}
            inputMode="decimal"
            aria-label={`${row.name} stok adedi`}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setTouched(true);
            }}
          />
          <span className="w-10 text-xs text-slate-400">{row.unit}</span>
        </div>
        {row.quantity === null && !touched && (
          // "Kaydı yok" ile "sıfır adet" farklı; kullanıcı hangisi olduğunu bilmeli.
          <p className="mt-0.5 text-right text-xs text-slate-400">Kayıt yok</p>
        )}
        {invalid && <p className="mt-0.5 text-right text-xs text-red-600">Geçersiz sayı</p>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">
        {row.updatedAt ? new Date(row.updatedAt).toLocaleString('tr-TR') : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <Button
            variant="secondary"
            loading={busy}
            disabled={!changed}
            onClick={() => parsed !== null && onSave(row.productId, parsed)}
          >
            Kaydet
          </Button>
        </div>
      </td>
    </tr>
  );
}
