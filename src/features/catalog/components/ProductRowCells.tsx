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

/** Görsel + ad + SET/PASİF rozetleri. Model kodu AYRI sütunda. */
export function ProductIdentityCell({ product: p }: { product: CatalogProduct }) {
  return (
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
        </div>
      </div>
    </td>
  );
}

/**
 * Model kodu.
 *
 * Ad hücresinin altında ikinci satır olarak duruyordu; ürün adı zaten modeli
 * içerdiği için ("Pierro Sandalye" / "Model: Pierro") her satırda aynı kelime
 * iki kez okunuyordu. Kendi sütununa alındı: tekrar bitti, kod da sıralanıp
 * taranabilir bir alan oldu.
 */
export function ModelCell({ code }: { code: string }) {
  return (
    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-slate-500">
      {code || '—'}
    </td>
  );
}

/** `null` adet "kayıt yok" demektir — "0 adet" ile aynı şey DEĞİL. */
export function StockCell({ quantity }: { quantity: number | null }) {
  const level = stockLevel(quantity);
  return (
    <td className="whitespace-nowrap px-4 py-4">
      <span
        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${STOCK_STYLE[level].chip}`}
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
      className={`whitespace-nowrap px-4 py-4 text-sm font-extrabold ${
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
    <td className="whitespace-nowrap px-4 py-4">
      <input
        type="checkbox"
        aria-label={`${p.name} seç`}
        checked={selected}
        onChange={() => onToggle(p.id)}
        className="size-4 cursor-pointer rounded border-slate-300 text-slate-900"
      />
    </td>
  );
}
