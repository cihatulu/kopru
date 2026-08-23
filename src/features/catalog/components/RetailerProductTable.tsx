import { TBODY, THEAD, TableEmpty } from '@/components/ui/Table';
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

const TH_L = 'px-2.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';
const TH_R = 'px-2.5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';
const TH_C = 'px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';

export function RetailerProductTable(props: Props) {
  const { products, stock, retailPrices, groupNames, selectedIds } = props;
  const ids = products.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full min-w-[980px] border-collapse">
        <thead className={THEAD}>
          <tr>
            {props.canEdit && (
              <th className="w-8 px-2 py-2.5 text-center">
                <input
                  type="checkbox"
                  aria-label="Tümünü seç"
                  checked={allSelected}
                  onChange={() => props.onToggleAll(ids, !allSelected)}
                  className="size-3.5 cursor-pointer rounded border-slate-300 text-slate-900"
                />
              </th>
            )}
            <th className={TH_L}>Ürün Adı</th>
            <th className={TH_L}>Grup</th>
            <th className={TH_L}>Model</th>
            <th className={TH_L}>Kategori</th>
            <th className={TH_C}>Stok</th>
            <th className={TH_R}>Alış Maliyeti</th>
            <th className={TH_R}>Satış Fiyatınız</th>
            <th className={TH_R}>Net Kâr</th>
            <th className={TH_R}>Kâr Marjı</th>
            {props.canEdit && <th className={TH_C}>İşlemler</th>}
          </tr>
        </thead>

        <tbody className={`${TBODY} bg-white divide-y divide-slate-100`}>
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
