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
 *
 * Görsel dil perakendeci kataloğuyla ORTAK: aynı kart iskeleti, aynı rozet
 * biçimi, aynı tipografi. Farklı olan yalnız içerik — burada sepet düğmesi
 * yoktur (üretici kendi ürününü sepete eklemez) ve tek stok rozeti vardır.
 */
export function ProductCard({ product, groupName, stock, highlighted, onOpen }: Props) {
  const image = product.images[0];

  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition-all duration-300 hover:shadow-xl ${
        highlighted ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="relative flex h-56 w-full items-center justify-center overflow-hidden border-b border-slate-100 bg-slate-50">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-12 text-slate-300"
            aria-hidden="true"
          >
            <path d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}

        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-slate-100 bg-white/95 px-2.5 py-1 shadow-md backdrop-blur-md">
          <span
            className={`size-1.5 rounded-full ${
              stock === null ? 'bg-slate-400' : stock > 0 ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span
            className={`text-[10px] font-extrabold uppercase ${
              stock === null ? 'text-slate-500' : stock > 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {stock === null ? 'Stok: —' : `Stok: ${stock}`}
          </span>
        </span>

        {product.type === 'set' && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/85 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
            Set
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Model kodu başlığın üstünde YAZILMAZ: ürün adı zaten modeli içeriyor. */}
        <h3
          title={product.name}
          className="line-clamp-1 text-base font-extrabold leading-snug text-slate-800 transition-colors group-hover:text-indigo-600"
        >
          {product.name}
        </h3>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-600">
          {groupName ?? 'Gruplanmamış'}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-lg font-black tabular-nums text-slate-950">
            {formatMoney(product.supplierPrice)}
          </span>
        </div>
      </div>
    </button>
  );
}
