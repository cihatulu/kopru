import { formatMoney } from '@/lib/format';
import { MARGIN_LABEL, marginBand, stockLevel, type StockLevel } from '../domain/productStats';
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

/** Görsel + ad + SET/PASİF rozetleri. */
export function ProductIdentityCell({ product: p }: { product: CatalogProduct }) {
  return (
    <td className="whitespace-nowrap px-2.5 py-2">
      <div className="flex items-center">
        <div className="size-9 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 shadow-xs">
          {p.images[0] ? (
            <img src={p.images[0]} alt="" className="size-9 object-cover" />
          ) : (
            <div className="flex size-9 items-center justify-center text-slate-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="size-4"
                aria-hidden="true"
              >
                <path d="M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
        <div className="ml-2.5 min-w-0 max-w-[180px]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 truncate" title={p.name}>
            <span className="truncate">{p.name}</span>
            {p.type === 'set' && (
              <span className="shrink-0 rounded bg-brand-600 px-1 py-0.2 text-[8px] font-black uppercase tracking-widest text-white">
                SET
              </span>
            )}
            {!p.isActive && (
              <span className="shrink-0 rounded bg-slate-200 px-1 py-0.2 text-[8px] font-black uppercase tracking-widest text-slate-600">
                PASİF
              </span>
            )}
          </div>
          {p.priceReviewNeeded && (
            <p className="mt-0.5 text-[10px] font-semibold text-amber-700 truncate">
              Fiyatı kontrol edin
            </p>
          )}
        </div>
      </div>
    </td>
  );
}

/** Model kodu. */
export function ModelCell({ code }: { code: string }) {
  return (
    <td className="whitespace-nowrap px-2 py-2 font-mono text-xs font-semibold text-slate-500">
      {code || '—'}
    </td>
  );
}

/** Stok seviyesi. */
export function StockCell({ quantity }: { quantity: number | null }) {
  const level = stockLevel(quantity);
  return (
    <td className="whitespace-nowrap px-2 py-2 text-center">
      <span
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${STOCK_STYLE[level].chip}`}
      >
        <span className={`size-1.5 rounded-full ${STOCK_STYLE[level].dot}`} />
        {quantity === null ? 'Kayıt yok' : `${quantity} Adet`}
      </span>
    </td>
  );
}

/** Net kâr; zarar kırmızı gösterilir. */
export function ProfitCell({ profit }: { profit: number | null }) {
  return (
    <td
      className={`whitespace-nowrap px-2 py-2 text-xs font-bold text-right tabular-nums ${
        profit !== null && profit < 0 ? 'text-red-600' : 'text-emerald-600'
      }`}
    >
      {profit === null ? '—' : formatMoney(profit)}
    </td>
  );
}

/** Kâr marjı yüzdesi + bant rozeti. */
export function MarginCell({ margin }: { margin: number | null }) {
  const band = marginBand(margin);
  return (
    <td className="whitespace-nowrap px-2 py-2 text-xs text-right tabular-nums">
      <div className="flex items-center justify-end gap-1.5">
        {margin !== null && (
          <span className={`font-bold ${margin < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            %{margin.toFixed(1)}
          </span>
        )}
        <span
          className={`rounded-md border px-1.5 py-0.2 text-[9px] font-bold tracking-wide ${BAND_STYLE[band]}`}
        >
          {MARGIN_LABEL[band]}
        </span>
      </div>
    </td>
  );
}

/** Satır seçim kutusu. */
export function SelectCell({
  product: p,
  selected,
  onToggle,
}: {
  product: CatalogProduct;
  selected: boolean;
  onToggle: (id: string) => void;
  }) {
  return (
    <td className="whitespace-nowrap px-2 py-2 text-center w-8">
      <input
        type="checkbox"
        aria-label={`${p.name} seç`}
        checked={selected}
        onChange={() => onToggle(p.id)}
        className="size-3.5 cursor-pointer rounded border-slate-300 text-slate-900"
      />
    </td>
  );
}
