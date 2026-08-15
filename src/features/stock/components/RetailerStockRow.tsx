import { useState, useEffect } from 'react';
import { parseQuantity } from '../domain/csv';
import { dimensionsText } from '../domain/retailerStockFilter';
import type { RetailerStockRow as Row } from '../api/useRetailerStockList';

interface Props {
  row: Row;
  busy: boolean;
  /** Satır YAZMAZ; yalnız değişikliği önerir. Onayı tablo alır. */
  onRequestSave: (quantity: number) => void;
}

/**
 * Perakendeci stok tablosunun tek satırı — adet hücresi yerinde düzenlenir.
 *
 * Kaydetme odak çıkışında (blur) ya da Enter ile olur; ayrı bir "kaydet"
 * düğmesi yok. Elli satırlık bir sayımda her satır için düğmeye basmak
 * gereksiz sürtünme yaratırdı.
 */
export function RetailerStockRow({ row, busy, onRequestSave }: Props) {
  const [value, setValue] = useState<string>(row.quantity === null ? '' : String(row.quantity));

  useEffect(() => {
    setValue(row.quantity === null ? '' : String(row.quantity));
  }, [row.quantity]);

  const parsed = parseQuantity(value);
  const changed = value.trim() !== '' && parsed !== null && parsed !== row.quantity;

  const commit = () => {
    if (changed && parsed !== null && !busy) {
      onRequestSave(parsed);
      // Onay diyaloğu açılır; vazgeçilirse hücre eski değerinde kalır.
      setValue(row.quantity === null ? '' : String(row.quantity));
    } else if (value.trim() === '') {
      // Boş bırakılan hücre "sıfır" demek değildir; eski değerine döner.
      setValue(row.quantity === null ? '' : String(row.quantity));
    }
  };

  const dims = dimensionsText(row) || '—';
  const qty = parsed ?? row.quantity;

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-black uppercase tracking-wide text-slate-600">
        {row.manufacturerName}
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap">
        {row.category ? (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {row.category}
          </span>
        ) : (
          <span className="text-xs italic text-slate-300">—</span>
        )}
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-sm text-slate-500">
        {row.code || '—'}
      </td>
      <td className="px-5 py-3.5 text-sm font-extrabold text-slate-900">{row.name}</td>
      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs font-bold text-slate-600">
        {dims}
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap text-center">
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${row.name} stok adedi`}
          value={value}
          disabled={busy}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`w-16 rounded-lg border px-2.5 py-1 text-center text-xs font-extrabold shadow-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 ${
            busy ? 'cursor-not-allowed opacity-50' : ''
          } ${
            qty === 0
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : qty !== null && qty < 10
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        />
      </td>
    </tr>
  );
}
