import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { discountedPrice } from '../domain/productSchema';
import { useProductStock } from '../api/useProductStock';
import { useRetailerStock } from '../api/useRetailerStock';
import { useRetailPrices } from '../api/useRetailPrices';
import { RetailerProductCard } from './RetailerProductCard';
import { ProductPreview } from './ProductPreview';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  products: CatalogProduct[];
  /** Tedarikçiyle aramızdaki iskonto oranı (%). Tek tedarikçi modunda kullanılır. */
  discountRate?: number;
  /** Tedarikçi bazlı iskonto haritası. Tüm üreticiler modunda kullanılır. */
  discountMap?: Record<string, number>;
  /**
   * Perakendeci ABONE mi.
   *
   * Misafir perakendecinin kendi stok kaydı yoktur; ona yalnız tedarikçinin
   * stoğu gösterilir. Abone ayrıca kendi deposundaki adedi de görür.
   */
  isSubscriber: boolean;
  loading: boolean;
  onAdd: (
    product: CatalogProduct,
    unitPrice: number,
    customDescription?: string,
    priceDifference?: number
  ) => void;
}

/**
 * Perakendecinin katalog ızgarası.
 *
 * Arama İSTEMCİDE yapılıyor: bu ekran tek veya tüm tedarikçilerin ürünlerini
 * gösterir ve o küme zaten sayfalanmış olarak gelir; her tuşta sunucuya
 * gitmek listeyi titretirdi.
 */
export function RetailerCatalogGrid({
  products,
  discountRate = 0,
  discountMap,
  isSubscriber,
  loading,
  onAdd,
}: Props) {
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<CatalogProduct | null>(null);

  const ids = products.map((p) => p.id);
  const stock = useProductStock(ids);
  const ownStock = useRetailerStock(ids, isSubscriber);
  const retailPrices = useRetailPrices(ids);

  const term = search.trim().toLocaleLowerCase('tr');
  const visible = term
    ? products.filter(
        (p) =>
          p.name.toLocaleLowerCase('tr').includes(term) ||
          p.code.toLocaleLowerCase('tr').includes(term),
      )
    : products;

  const costPriceOf = (p: CatalogProduct) => {
    const rate = discountMap ? (discountMap[p.ownerOrgId] ?? 0) : discountRate;
    return discountedPrice(p.supplierPrice, rate);
  };

  const displayPriceOf = (p: CatalogProduct) => {
    return retailPrices.data?.[p.id] ?? costPriceOf(p);
  };

  return (
    <div className="space-y-5">
      <div className="relative rounded-2xl border border-slate-100 bg-white p-2 shadow-md">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Ürün adı veya model ara..."
          aria-label="Ürün ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-xl border-none bg-transparent py-3 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : visible.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto size-10 text-slate-300"
            aria-hidden="true"
          >
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Ürün bulunamadı</h3>
            <p className="text-xs text-slate-400">
              {term ? 'Arama kriterlerinize uygun ürün yok.' : 'Bu tedarikçinin aktif ürünü yok.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <RetailerProductCard
              key={p.id}
              product={p}
              unitPrice={displayPriceOf(p)}
              stock={stock.data?.[p.id] ?? null}
              ownStock={isSubscriber ? (ownStock.data?.[p.id] ?? 0) : undefined}
              onOpen={setPreview}
              onAdd={(product) => onAdd(product, displayPriceOf(product))}
            />
          ))}
        </div>
      )}

      {preview && (
        <ProductPreview
          product={preview}
          groupName={null}
          stock={stock.data?.[preview.id] ?? null}
          priceOverride={displayPriceOf(preview)}
          onAddToCart={(customDesc, priceDiff) => {
            onAdd(preview, displayPriceOf(preview), customDesc, priceDiff);
            setPreview(null);
          }}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
