import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/format';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  product: CatalogProduct;
  /** İskonto uygulanmış birim fiyat — perakendecinin gerçekte ödeyeceği tutar. */
  unitPrice: number;
  onAdd: () => void;
}

/**
 * Perakendecinin gördüğü katalog satırı.
 * Üreticinin maliyeti bu ekrana hiçbir yoldan gelmez — ayrı tabloda ve
 * perakendecinin RLS kapsamı dışında (A4).
 */
export function CatalogRow({ product, unitPrice, onAdd }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-inset ring-slate-200">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{product.name}</p>
        <p className="font-mono text-xs text-slate-500">{product.code}</p>
        {product.description && (
          <p className="mt-1 max-w-md truncate text-xs text-slate-500">{product.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-medium text-slate-900">{formatMoney(unitPrice)}</span>
        <Button variant="secondary" onClick={onAdd}>
          Sepete ekle
        </Button>
      </div>
    </div>
  );
}
