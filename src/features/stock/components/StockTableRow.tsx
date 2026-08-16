import { useState, useEffect } from 'react';
import { parseQuantity } from '../domain/csv';
import type { StockRow } from '../api/useStockList';

const FurnitureIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h12.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface Props {
  row: StockRow;
  groupName: string | null;
  categoryBadgeColor: string;
  busy: boolean;
  /** Satır YAZMAZ; yalnız değişikliği önerir. Onayı tablo alır. */
  onRequestSave: (quantity: number) => void;
  /** Yalnız PASİF satırda gösterilir. */
  onDelete: () => void;
}

/** Stok tablosunun tek satırı — miktar hücresi yerinde düzenlenebilir. */
export function StockTableRow({
  row,
  groupName,
  categoryBadgeColor,
  busy,
  onRequestSave,
  onDelete,
}: Props) {
  const [value, setValue] = useState<string>(row.quantity === null ? '' : String(row.quantity));

  useEffect(() => {
    setValue(row.quantity === null ? '' : String(row.quantity));
  }, [row.quantity]);

  const parsed = parseQuantity(value);
  const changed = value.trim() !== '' && parsed !== null && parsed !== row.quantity;

  const handleBlur = () => {
    if (changed && parsed !== null && !busy) {
      onRequestSave(parsed);
      // Onay diyaloğu açılır. Kullanıcı vazgeçerse alan eski değere döner:
      // `row.quantity` değişmediği için useEffect bunu geri yazar.
      setValue(row.quantity === null ? '' : String(row.quantity));
    } else if (value.trim() === '') {
      setValue(row.quantity === null ? '' : String(row.quantity));
    }
  };

  const dims =
    row.widthCm || row.depthCm || row.heightCm
      ? `${row.widthCm || '-'} x ${row.depthCm || '-'} x ${row.heightCm || '-'}`
      : '—';

  const features =
    row.variants.map((v) => `${v.name}: ${v.options.join('/')}`).join(', ') || '—';

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      {/* Ürün Adı */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-150 flex items-center justify-center text-slate-455">
            {row.images.length > 0 ? (
              <img src={row.images[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <FurnitureIcon />
            )}
          </div>
          <span className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-default">
            {row.name}
          </span>
          {/*
            Pasif ürünün stoğu olabilir ama katalogda görünmez ve sipariş
            edilemez. Rozet olmasaydı kullanıcı listede gördüğü ürünün
            satışta olduğunu sanardı.
          */}
          {!row.isActive && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600">
              Pasif
            </span>
          )}
        </div>
      </td>

      {/* Grup Adı */}
      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-500">
        {groupName ? (
          <span className="bg-blue-50 text-blue-750 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-blue-150">
            {groupName}
          </span>
        ) : (
          <span className="text-slate-350 text-xs italic">—</span>
        )}
      </td>

      {/* Model */}
      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-500 font-mono">
        {row.code || '—'}
      </td>

      {/* Kategori */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        {row.category ? (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${categoryBadgeColor}`}>
            {row.category}
          </span>
        ) : (
          <span className="text-slate-350 text-xs italic">—</span>
        )}
      </td>

      {/* Ölçüler */}
      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-500 font-mono">
        {dims}
      </td>

      {/* Özellikler */}
      <td className="px-5 py-3.5 text-xs text-slate-550 max-w-xs truncate whitespace-nowrap" title={features}>
        {features}
      </td>

      {/*
        Silme YALNIZ pasif satırda görünür (kilitli kural 16). Hatalı bir
        Excel yüklemesinden doğan ürünü temizlemenin yolu budur; aktif ürün
        buradan silinemez.
      */}
      <td className="px-5 py-3.5 whitespace-nowrap text-center">
        {!row.isActive && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-lg px-2 py-1 text-[10px] font-extrabold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 cursor-pointer"
          >
            Sil
          </button>
        )}
      </td>

      {/* Stok Miktarı (yerinde düzenleme) */}
      <td className="px-5 py-3.5 whitespace-nowrap text-center">
        <div className="flex items-center justify-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleBlur();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className={`w-14 text-center px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-text shadow-sm ${
              busy ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              row.quantity === 0 || parsed === 0
                ? 'bg-red-50 border-red-200 text-red-700 focus:bg-white'
                : row.quantity !== null && (row.quantity < 10 || (parsed !== null && parsed < 10))
                ? 'bg-amber-50 border-amber-250 text-amber-700 focus:bg-white'
                : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'
            }`}
          />
        </div>
      </td>
    </tr>
  );
}
