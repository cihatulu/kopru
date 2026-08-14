import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/format';
import { formatDimensions } from '../domain/variants';
import { CustomRequestFields } from './CustomRequestFields';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  product: CatalogProduct;
  groupName: string | null;
  stock: number | null;
  /**
   * Perakendeci görünümünde iskonto uygulanmış fiyat.
   * Verilmezse ürünün liste fiyatı gösterilir (üretici görünümü).
   */
  priceOverride?: number | undefined;
  /** Verilirse alt kısımda "Sepete ekle" çıkar — perakendeci görünümü. */
  onAddToCart?: ((customDescription?: string, priceDifference?: number) => void) | undefined;
  onClose: () => void;
}

/**
 * Katalog kartına tıklayınca açılan önizleme.
 *
 * Düzenleme YOK — burası vitrin. Düzenleme Ürün Yönetimi ekranındadır; iki
 * ekranda iki farklı düzenleme yolu olması, hangisinin kaydettiğini
 * belirsizleştirirdi. Maliyet ve marj da burada gösterilmez (A4).
 */
export function ProductPreview({
  product,
  groupName,
  stock,
  priceOverride,
  onAddToCart,
  onClose,
}: Props) {
  const [imageIndex, setImageIndex] = useState(0);
  const [customDescription, setCustomDescription] = useState('');
  const [priceDifference, setPriceDifference] = useState<number | ''>('');

  const dimensions = formatDimensions(product.dimensions);
  const image = product.images[imageIndex];

  const basePrice = priceOverride ?? product.supplierPrice;
  const diffVal = Number(priceDifference) || 0;
  const finalPrice = basePrice + diffVal;

  return (
    <Modal
      label={product.name}
      panelClassName={'max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl'}
      onClose={onClose}
    >
      <div className="aspect-[16/9] w-full bg-slate-100">
        {image ? (
          <img src={image} alt={product.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-slate-400">
            Görsel yok
          </div>
        )}
      </div>

      {product.images.length > 1 && (
        <div className="flex gap-2 px-6 pt-4">
          {product.images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Görsel ${i + 1}`}
              onClick={() => setImageIndex(i)}
              className={`size-14 overflow-hidden rounded-lg ring-2 ${
                i === imageIndex ? 'ring-slate-900' : 'ring-transparent'
              }`}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4 p-6 text-left">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
            {groupName ?? 'Gruplanmamış'}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{product.name}</h2>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{product.code}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-2xl font-bold text-slate-900">
            {formatMoney(finalPrice)}
          </span>
          <span className="text-sm text-slate-500">
            Stok: {stock === null ? 'kayıt yok' : stock}
          </span>
          {product.type === 'set' && (
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
              SET · {product.setContents.length} kalem
            </span>
          )}
        </div>

        {dimensions && (
          <p className="text-sm text-slate-600">
            <span className="text-slate-400">Ölçüler: </span>
            {dimensions}
          </p>
        )}

        {product.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {product.description}
          </p>
        )}

        {product.variants.length > 0 && (
          <div className="space-y-2">
            {product.variants.map((v) => (
              <div key={v.name}>
                <p className="text-xs font-semibold text-slate-500">{v.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {v.options.map((o) => (
                    <span
                      key={o}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                    >
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {onAddToCart && (
          <CustomRequestFields
            description={customDescription}
            onDescriptionChange={setCustomDescription}
            difference={priceDifference}
            onDifferenceChange={setPriceDifference}
            basePrice={basePrice}
          />
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
          {onAddToCart && stock !== 0 && (
            <Button
              onClick={() =>
                onAddToCart(
                  customDescription.trim() || undefined,
                  diffVal || undefined
                )
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Sepete ekle
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
