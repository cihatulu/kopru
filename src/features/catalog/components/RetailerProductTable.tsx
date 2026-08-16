import { TBODY, TH, THEAD, TableEmpty } from '@/components/ui/Table';
import { RetailerProductRow } from './RetailerProductRow';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  products: CatalogProduct[];
  stock: Record<string, number> | undefined;
  retailPrices: Record<string, number> | undefined;
  groupNames: Map<string, string>;
  canDelete: boolean;
  canEdit: boolean;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: (ids: string[], selectAll: boolean) => void;
  onEdit: (p: CatalogProduct) => void;
  onToggleActive: (p: CatalogProduct) => void;
  onDelete: (p: CatalogProduct) => void;
  onUpdateRetailPrice: (productId: string, price: number) => void;
}


export function RetailerProductTable(props: Props) {
  const { products, stock, retailPrices, groupNames, selectedIds } = props;
  const ids = products.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
      <table className="min-w-[1000px] lg:min-w-full">
        <thead className={THEAD}>
          <tr>
            {props.canEdit && (
              <th className="w-10 px-4 py-2.5 text-left">
                <input
                  type="checkbox"
                  aria-label="Tümünü seç"
                  checked={allSelected}
                  onChange={() => props.onToggleAll(ids, !allSelected)}
                  className="size-4 cursor-pointer rounded border-slate-300 text-slate-900"
                />
              </th>
            )}
            <th className={TH}>Ürün Adı</th>
            <th className={TH}>Grup</th>
            <th className={TH}>Model</th>
            <th className={TH}>Kategori</th>
            <th className={TH}>Stok</th>
            <th className={TH}>Alış Maliyeti</th>
            <th className={TH}>Satış Fiyatınız</th>
            <th className={TH}>Net Kâr</th>
            <th className={`${TH} w-28`}>Kâr Marjı</th>
            {props.canEdit && <th className={`${TH} w-24 text-center`}>İşlemler</th>}
          </tr>
        </thead>

        <tbody className={`${TBODY} bg-white`}>
          {products.length === 0 && (
            <TableEmpty colSpan={props.canEdit ? 11 : 10}>
              Aradığınız kriterlere uygun ürün bulunamadı.
            </TableEmpty>
          )}

          {products.map((p) => (
            <RetailerProductRow
              key={p.id}
              product={p}
              quantity={stock?.[p.id] ?? null}
              retailPrice={retailPrices?.[p.id]}
              groupName={p.groupId ? (groupNames.get(p.groupId) ?? null) : null}
              canDelete={props.canDelete}
              canEdit={props.canEdit}
              selected={selectedIds.has(p.id)}
              onToggle={props.onToggleOne}
              onEdit={props.onEdit}
              onToggleActive={props.onToggleActive}
              onDelete={props.onDelete}
              onUpdateRetailPrice={props.onUpdateRetailPrice}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
