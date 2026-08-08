import { Button } from '@/components/ui/Button';
import { formatMoney, formatQuantity } from '@/lib/format';
import { marginPercent } from '../domain/productSchema';
import { formatDimensions } from '../domain/variants';
import type { CatalogProduct } from '../api/useProducts';

interface Props {
  products: CatalogProduct[];
  /** Yalnız üretici görünümünde dolu gelir; perakendecide RLS boş döndürür. */
  costs?: Record<string, number> | undefined;
  stock?: Record<string, number> | undefined;
  busyId?: string | undefined;
  onEdit: (p: CatalogProduct) => void;
  onToggleActive: (p: CatalogProduct) => void;
}

const TH = 'px-4 py-2.5 text-left text-xs font-semibold text-slate-500';
const TD = 'px-4 py-3 align-middle';

/** Üreticinin kendi katalog yönetimi. Maliyet ve marj sütunları yalnız burada. */
export function ProductTable(props: Props) {
  const { products, costs, stock, busyId, onEdit, onToggleActive } = props;
  if (products.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Henüz ürün yok.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-inset ring-slate-200">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={TH}>Ürün</th>
            <th className={`${TH} text-right`}>Satış fiyatı</th>
            <th className={`${TH} text-right`}>Maliyetiniz</th>
            <th className={`${TH} text-right`}>Marj</th>
            <th className={`${TH} text-right`}>Stok</th>
            <th className={TH}>Durum</th>
            <th className={`${TH} text-right`}>İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((p) => {
            const cost = costs?.[p.id];
            const margin = marginPercent(p.supplierPrice, cost);
            return (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <td className={TD}>
                  <div className="flex items-center gap-3">
                    {p.images[0] ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="size-11 shrink-0 rounded-lg border border-slate-100 object-cover"
                      />
                    ) : (
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="size-5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="block font-medium text-slate-900">
                        {p.name}
                        {p.type === 'set' && (
                          <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                            SET
                          </span>
                        )}
                      </span>
                      <span className="block font-mono text-xs text-slate-500">
                        {p.code}
                        {formatDimensions(p.dimensions) && ` · ${formatDimensions(p.dimensions)}`}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={`${TD} text-right font-medium text-slate-900`}>
                  {formatMoney(p.supplierPrice)}
                </td>
                <td className={`${TD} text-right text-slate-600`}>
                  {cost === undefined ? (
                    <span className="text-slate-400">girilmedi</span>
                  ) : (
                    formatMoney(cost)
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  {margin === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className={margin < 10 ? 'text-amber-700' : 'text-emerald-700'}>
                      %{margin}
                    </span>
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  {stock?.[p.id] === undefined ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className={stock[p.id]! <= 0 ? 'text-rose-600' : 'text-slate-700'}>
                      {formatQuantity(stock[p.id]!)}
                    </span>
                  )}
                </td>
                <td className={TD}>
                  {p.isActive ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Pasif
                    </span>
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  <div className="inline-flex gap-1.5">
                    <Button variant="secondary" onClick={() => onEdit(p)}>
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      loading={busyId === p.id}
                      onClick={() => onToggleActive(p)}
                    >
                      {p.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
