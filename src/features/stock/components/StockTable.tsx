import { useState, useEffect } from 'react';
import { parseQuantity } from '../domain/csv';
import type { StockRow } from '../api/useStockList';

interface Props {
  rows: StockRow[];
  groups: { id: string; name: string }[];
  busyId: string | undefined;
  onSave: (productId: string, quantity: number) => void;
}

const FurnitureIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h12.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export function StockTable({ rows, groups, busyId, onSave }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-350">
            📭
          </div>
          <p className="text-sm font-medium text-slate-400">Ürün bulunamadı.</p>
        </div>
      </div>
    );
  }

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-indigo-50 border-indigo-200 text-indigo-700',
      'bg-purple-50 border-purple-200 text-purple-700',
      'bg-pink-50 border-pink-200 text-pink-700',
      'bg-blue-50 border-blue-200 text-blue-700'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto w-full scrollbar-thin table-scroll-shadow">
        <table className="min-w-[1000px] lg:min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/80">
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Ürün Adı</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Grup Adı</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Model</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Kategori</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Ölçüler (E x B x Y)</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Özellikler</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[120px]">Stok</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {rows.map((r, idx) => {
              const groupName = groups.find((g) => g.id === r.groupId)?.name || null;
              return (
                <Row
                  key={r.productId}
                  row={r}
                  groupName={groupName}
                  categoryBadgeColor={getCategoryColor(idx)}
                  busy={busyId === r.productId}
                  onSave={onSave}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  row,
  groupName,
  categoryBadgeColor,
  busy,
  onSave,
}: {
  row: StockRow;
  groupName: string | null;
  categoryBadgeColor: string;
  busy: boolean;
  onSave: (productId: string, quantity: number) => void;
}) {
  const [value, setValue] = useState<string>(row.quantity === null ? '' : String(row.quantity));

  useEffect(() => {
    setValue(row.quantity === null ? '' : String(row.quantity));
  }, [row.quantity]);

  const parsed = parseQuantity(value);
  const changed = value.trim() !== '' && parsed !== null && parsed !== row.quantity;

  const handleBlur = () => {
    if (changed && parsed !== null && !busy) {
      onSave(row.productId, parsed);
    } else if (value.trim() === '') {
      setValue(row.quantity === null ? '' : String(row.quantity));
    }
  };

  const dims =
    row.widthCm || row.depthCm || row.heightCm
      ? `${row.widthCm || '-'} x ${row.depthCm || '-'} x ${row.heightCm || '-'}`
      : '—';

  const features =
    row.variants
      ?.map((v) => `${v.name}: ${v.options?.join('/') || ''}`)
      .join(', ') || '—';

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      {/* Ürün Adı */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-150 flex items-center justify-center text-slate-455">
            {row.images && row.images.length > 0 ? (
              <img src={row.images[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <FurnitureIcon />
            )}
          </div>
          <span className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-default">
            {row.name}
          </span>
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

      {/* Stok Miktarı (Inline Düzenlenebilir Arayüz) */}
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
                ? 'bg-rose-50 border-rose-200 text-rose-700 focus:bg-white'
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
