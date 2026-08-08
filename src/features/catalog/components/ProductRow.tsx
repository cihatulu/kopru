import { formatMoney } from '@/lib/format';
import {
  MARGIN_LABEL,
  marginBand,
  netProfit,
  stockLevel,
  type StockLevel,
} from '../domain/productStats';
import { marginPercent } from '../domain/productSchema';
import type { CatalogProduct } from '../api/useProducts';

const STOCK_STYLE: Record<StockLevel, { chip: string; dot: string }> = {
  out: { chip: 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-500' },
  low: { chip: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
  ok: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
  unknown: { chip: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
};

const BAND_STYLE = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  mid: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-red-50 text-red-700 border-red-100',
  unknown: 'bg-slate-100 text-slate-500 border-slate-200',
} as const;

interface Props {
  product: CatalogProduct;
  /** Yalnız üretici görünümünde dolu gelir; perakendecide RLS boş döndürür (A4). */
  cost: number | undefined;
  quantity: number | null;
  groupName: string | null;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (p: CatalogProduct) => void;
  onDelete: (p: CatalogProduct) => void;
}

export function ProductRow({
  product: p,
  cost,
  quantity,
  groupName,
  selected,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  const level = stockLevel(quantity);
  const margin = marginPercent(p.supplierPrice, cost);
  const band = marginBand(margin);
  const profit = netProfit(p.supplierPrice, cost);

  return (
    <tr className={`transition-colors hover:bg-slate-50/45 ${selected ? 'bg-indigo-50/30' : ''}`}>
      <td className="whitespace-nowrap px-4 py-4">
        <input
          type="checkbox"
          aria-label={`${p.name} seç`}
          checked={selected}
          onChange={() => onToggle(p.id)}
          className="size-4 cursor-pointer rounded border-slate-300 text-slate-900"
        />
      </td>

      <td className="whitespace-nowrap px-4 py-4">
        <div className="flex items-center">
          <div className="size-11 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
            {p.images[0] ? (
              <img src={p.images[0]} alt="" className="size-11 object-cover" />
            ) : (
              <div className="flex size-11 items-center justify-center text-slate-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="size-5"
                  aria-hidden="true"
                >
                  <path d="M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
          <div className="ml-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              {p.name}
              {p.type === 'set' && (
                <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                  SET
                </span>
              )}
              {!p.isActive && (
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-slate-600">
                  PASİF
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-slate-400">
              Model: {p.code || '—'}
            </div>
          </div>
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-600">
        {groupName ?? '—'}
      </td>

      <td className="whitespace-nowrap px-4 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${STOCK_STYLE[level].chip}`}
        >
          <span className={`size-1.5 rounded-full ${STOCK_STYLE[level].dot}`} />
          {quantity === null ? 'Kayıt yok' : `${quantity} Adet`}
        </span>
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-500">
        {cost === undefined ? '—' : formatMoney(cost)}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm font-extrabold text-slate-800">
        {formatMoney(p.supplierPrice)}
      </td>
      <td
        className={`whitespace-nowrap px-4 py-4 text-sm font-extrabold ${
          profit !== null && profit < 0 ? 'text-red-600' : 'text-emerald-600'
        }`}
      >
        {profit === null ? '—' : formatMoney(profit)}
      </td>

      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <div className="flex items-center gap-2">
          {margin !== null && (
            <span className={`font-extrabold ${margin < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {margin.toFixed(1)}%
            </span>
          )}
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${BAND_STYLE[band]}`}
          >
            {MARGIN_LABEL[band]}
          </span>
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <IconButton label="Düzenle" onClick={() => onEdit(p)}>
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
          </IconButton>
          <IconButton label="Sil" danger onClick={() => onDelete(p)}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 ${
        danger ? 'hover:text-red-500' : 'hover:text-slate-800'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
