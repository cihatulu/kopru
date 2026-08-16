import { TBODY, TH, THEAD, TableEmpty } from '@/components/ui/Table';
import { ProductRow } from './ProductRow';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  products: CatalogProduct[];
  /** Yalnız üretici görünümünde dolu gelir; perakendecide RLS boş döndürür (A4). */
  costs: Record<string, number> | undefined;
  stock: Record<string, number> | undefined;
  groupNames: Map<string, string>;
  /** Kalıcı silme yetkisi — yalnız org sahibi. */
  canDelete: boolean;
  selectedIds: Set<string>;
  isGuest?: boolean;
  onSaveCost?: (productId: string, costPrice: number) => void;
  onToggleOne: (id: string) => void;
  onToggleAll: (ids: string[], selectAll: boolean) => void;
  onEdit: (p: CatalogProduct) => void;
  onToggleActive: (p: CatalogProduct) => void;
  onDelete: (p: CatalogProduct) => void;
}

/** Üreticinin katalog yönetimi tablosu. Maliyet ve marj sütunları yalnız burada. */
export function ProductTable(props: Props) {
  const { products, costs, stock, groupNames, selectedIds, isGuest, onSaveCost } = props;
  const ids = products.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
      <table className="min-w-[1000px] lg:min-w-full">
        <thead className={THEAD}>
          <tr>
            <th className="w-10 px-4 py-2.5 text-left">
              <input
                type="checkbox"
                aria-label="Tümünü seç"
                checked={allSelected}
                onChange={() => props.onToggleAll(ids, !allSelected)}
                className="size-4 cursor-pointer rounded border-slate-300 text-slate-900"
              />
            </th>
            <th className={TH}>Ürün Adı</th>
            <th className={TH}>Grup</th>
            <th className={TH}>Model</th>
            <th className={TH}>Kategori</th>
            <th className={TH}>Stok</th>
            <th className={TH}>Maliyet</th>
            <th className={TH}>Satış Fiyatı</th>
            <th className={TH}>Net Kâr</th>
            <th className={`${TH} w-28`}>Kâr Marjı</th>
            <th className={`${TH} w-24 text-center`}>İşlemler</th>
          </tr>
        </thead>

        <tbody className={`${TBODY} bg-white`}>
          {products.length === 0 && (
            <TableEmpty colSpan={11}>Aradığınız kriterlere uygun ürün bulunamadı.</TableEmpty>
          )}

          {products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              cost={costs?.[p.id]}
              quantity={stock?.[p.id] ?? null}
              groupName={p.groupId ? (groupNames.get(p.groupId) ?? null) : null}
              canDelete={props.canDelete}
              selected={selectedIds.has(p.id)}
              isGuest={isGuest ?? false}
              {...(onSaveCost ? { onSaveCost } : {})}
              onToggle={props.onToggleOne}
              onEdit={props.onEdit}
              onToggleActive={props.onToggleActive}
              onDelete={props.onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
