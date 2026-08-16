import { IconButton } from '@/components/ui/IconButton';
import { formatMoney } from '@/lib/format';
import { netProfit } from '../domain/productStats';
import { marginPercent } from '../domain/productSchema';
import type { CatalogProduct } from '../api/useProducts';
import { RetailPriceCell } from './RetailPriceCell';
import {
  MarginCell,
  ModelCell,
  ProductIdentityCell,
  ProfitCell,
  SelectCell,
  StockCell,
} from './ProductRowCells';

interface Props {
  product: CatalogProduct;
  quantity: number | null;
  retailPrice: number | undefined;
  groupName: string | null;
  canDelete: boolean;
  canEdit: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (p: CatalogProduct) => void;
  onToggleActive: (p: CatalogProduct) => void;
  onDelete: (p: CatalogProduct) => void;
  onUpdateRetailPrice: (productId: string, price: number) => void;
}

/**
 * Perakendecinin katalog satırı.
 *
 * Marj ve kâr KATMAN 2 (tedarikçi fiyatı) ile KATMAN 3 (kendi satış fiyatı)
 * arasından hesaplanır; üreticinin maliyeti bu tarafta hiç bulunmaz (A4).
 */
export function RetailerProductRow({
  product: p,
  quantity,
  retailPrice,
  groupName,
  canDelete,
  canEdit,
  selected,
  onToggle,
  onEdit,
  onToggleActive,
  onDelete,
  onUpdateRetailPrice,
}: Props) {
  const margin = marginPercent(retailPrice ?? 0, p.supplierPrice);
  const profit = netProfit(retailPrice ?? 0, p.supplierPrice);

  return (
    <tr className={`transition-colors hover:bg-slate-50/45 ${selected ? 'bg-brand-50' : ''}`}>
      {canEdit && <SelectCell product={p} selected={selected} onToggle={onToggle} />}

      <ProductIdentityCell product={p} />

      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600">
        {groupName ?? '—'}
      </td>

      <ModelCell code={p.code} />

      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{p.category ?? '—'}</td>

      <StockCell quantity={quantity} />

      <td className="whitespace-nowrap px-4 py-3 text-sm font-extrabold text-slate-800">
        {formatMoney(p.supplierPrice)}
      </td>

      <RetailPriceCell
        productId={p.id}
        retailPrice={retailPrice}
        onSave={onUpdateRetailPrice}
      />

      <ProfitCell profit={profit} />
      <MarginCell margin={margin} />

      {canEdit && (
        <td className="whitespace-nowrap px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <IconButton label="Düzenle" onClick={() => onEdit(p)}>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </IconButton>
            {p.isActive ? (
              <IconButton label="Pasife al" onClick={() => onToggleActive(p)}>
                <path d="M18.36 6.64A9 9 0 1112 3v9" />
              </IconButton>
            ) : (
              <IconButton label="Aktife al" onClick={() => onToggleActive(p)}>
                <path d="M20 6L9 17l-5-5" />
              </IconButton>
            )}
            {canDelete && !p.isActive && (
              <IconButton label="Kalıcı olarak sil" danger onClick={() => onDelete(p)}>
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
              </IconButton>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
