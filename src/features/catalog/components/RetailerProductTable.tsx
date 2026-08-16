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

const TH = 'px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500';

export function RetailerProductTable(props: Props) {
  const { products, stock, retailPrices, groupNames, selectedIds } = props;
  const ids = products.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-[1000px] divide-y divide-slate-100 lg:min-w-full">
        <thead className="bg-slate-50/75">
          <tr>
            {props.canEdit && (
              <th className="w-10 px-4 py-4 text-left">
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

        <tbody className="divide-y divide-slate-100 bg-white">
          {products.length === 0 && (
            <tr>
              <td colSpan={props.canEdit ? 11 : 10} className="py-16 text-center text-sm italic text-slate-400">
                Aradığınız kriterlere uygun ürün bulunamadı.
              </td>
            </tr>
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
