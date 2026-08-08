import { formatMoney } from '@/lib/format';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  product: CatalogProduct;
  groupName: string | null;
  /** Stok kaydı yoksa null — "0 adet" ile aynı şey değildir. */
  stock: number | null;
  highlighted: boolean;
  onOpen: (product: CatalogProduct) => void;
}

/**
 * Katalog kartı.
 *
 * Maliyet ve marj BURADA GÖSTERİLMEZ. Katalog, ürünü "vitrinde" gösteren
 * ekrandır ve ekran paylaşımı/sunum sırasında açık kalması olağandır; maliyet
 * Ürün Yönetimi tablosunda kalır (A4'ün arayüz tarafındaki karşılığı).
 */
export function ProductCard({ product, groupName, stock, highlighted, onOpen }: Props) {
  const image = product.images[0];

  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className={`group flex flex-col overflow-hidden rounded-xl bg-white text-left ring-1 transition-shadow hover:shadow-md ${
        highlighted ? 'ring-2 ring-slate-900' : 'ring-slate-200'
      }`}
    >
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        {image ? (
          <img src={image} alt={product.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="size-10"
              aria-hidden="true"
            >
              <path d="M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        <span
          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${
            stock === null
              ? 'bg-white/90 text-slate-500 ring-slate-200'
              : stock > 0
                ? 'bg-white/90 text-emerald-700 ring-emerald-200'
                : 'bg-white/90 text-red-700 ring-red-200'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              stock === null ? 'bg-slate-400' : stock > 0 ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {stock === null ? 'STOK: —' : `STOK: ${stock}`}
        </span>

        {product.type === 'set' && (
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/85 px-2 py-1 text-[11px] font-semibold text-white">
            SET
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {product.code || '—'}
        </p>
        <h3 className="mt-1 font-bold text-slate-900">{product.name}</h3>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
          {groupName ?? 'Gruplanmamış'}
        </p>

        <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
          <span className="text-lg font-bold text-slate-900">
            {formatMoney(product.supplierPrice)}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </button>
  );
}
