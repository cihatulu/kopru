import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  product: CatalogProduct;
  /** İskonto uygulanmış birim fiyat — perakendecinin gerçekte ödeyeceği tutar. */
  unitPrice: number;
  /** Tedarikçinin (üreticinin) stoğu; kayıt yoksa null. */
  stock: number | null;
  /**
   * Perakendecinin KENDİ deposundaki adet.
   *
   * Yalnız ABONE perakendeciye gösterilir — misafirin kendi stok kaydı yoktur
   * ve olmayan bir sayıyı "0" diye göstermek onu yanlış karara sürüklerdi.
   * `undefined` = bu kullanıcıya gösterilmez.
   */
  ownStock?: number | null | undefined;
  onOpen: (p: CatalogProduct) => void;
  onAdd: (p: CatalogProduct) => void;
}

/**
 * Perakendecinin gördüğü ürün kartı.
 *
 * Üreticinin MALİYETİ bu ekrana hiçbir yoldan gelmez — ayrı tabloda ve
 * perakendecinin RLS kapsamı dışında (A4). Kartta yalnız iskontolu satış
 * fiyatı vardır.
 */
export function RetailerProductCard({ product, unitPrice, stock, ownStock, onOpen, onAdd }: Props) {
  const [added, setAdded] = useState(false);
  const outOfStock = stock === 0;

  const add = () => {
    onAdd(product);
    setAdded(true);
    // Kısa bir onay: buton "Eklendi"ye döner ve kendiliğinden geri gelir.
    window.setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:border-slate-300 hover:shadow-xl">
      <button
        type="button"
        aria-label={`${product.name} detayları`}
        onClick={() => onOpen(product)}
        className="relative flex h-56 w-full items-center justify-center overflow-hidden border-b border-slate-100 bg-slate-50"
      >
        {product.images[0] ? (
          <img
            src={product.images[0]}
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

        {/*
          İki stok ayrı ayrı gösterilir ve ETİKETLENİR: "tedarikçide 17 var"
          ile "bende 3 var" farklı kararlara yol açar; tek bir "Stok" rozeti
          hangisini gösterdiğini belirsiz bırakırdı.
        */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          <span className="flex items-center gap-1.5 rounded-full border border-slate-100 bg-white/95 px-2.5 py-1 shadow-md backdrop-blur-md">
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
              {stock === null ? 'Tedarikçi: —' : `Tedarikçi: ${stock}`}
            </span>
          </span>

          {ownStock !== undefined && (
            <span className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white/95 px-2.5 py-1 shadow-md backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-extrabold uppercase text-indigo-600">
                Bende: {ownStock ?? 0}
              </span>
            </span>
          )}
        </div>

        {product.type === 'set' && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/85 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
            Set
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-5">
        {/* Model kodu başlığın üstünde YAZILMAZ: ürün adı zaten modeli
            içeriyor ("Pierro Sandalye"), tekrarı kartı kalabalıklaştırıyordu. */}
        <button
          type="button"
          onClick={() => onOpen(product)}
          title={product.name}
          className="line-clamp-1 text-left text-base font-extrabold leading-snug text-slate-800 transition-colors group-hover:text-indigo-600"
        >
          {product.name}
        </button>
        {product.description && (
          <p className="mt-1.5 line-clamp-2 min-h-8 text-xs text-slate-500">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-lg font-black tabular-nums text-slate-950">
            {formatMoney(unitPrice)}
          </span>

          <button
            type="button"
            onClick={add}
            disabled={outOfStock}
            title={outOfStock ? 'Bu ürün tükendi' : undefined}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 ${
              outOfStock
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : added
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {added ? 'Eklendi' : outOfStock ? 'Tükendi' : 'Sepete Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}
