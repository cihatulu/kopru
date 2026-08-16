import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RetailerStockRow } from './RetailerStockRow';
import { StockChangeMessage, type PendingStockChange } from './StockChangeMessage';
import { StockDeleteDialog, type PendingProductDelete } from './StockDeleteDialog';
import {
  EMPTY_STOCK_FILTERS,
  isStockFilterActive,
  type StockFilters,
} from '../domain/retailerStockFilter';
import type { RetailerStockRow as Row } from '../api/useRetailerStockList';

interface Props {
  rows: Row[];
  loading: boolean;
  busy: boolean;
  filters: StockFilters;
  onFiltersChange: (next: StockFilters) => void;
  onSave: (productId: string, quantity: number) => void;
}

const TH = 'px-5 pt-4 pb-1 text-left';
const FILTER_KEYS: { key: keyof StockFilters; label: string }[] = [
  { key: 'manufacturer', label: 'Üretici' },
  { key: 'category', label: 'Kategori' },
  { key: 'code', label: 'Model' },
  { key: 'name', label: 'Ürün adı' },
  { key: 'dimensions', label: 'Ölçü' },
];

/** Perakendeci stok tablosu — kolon başlıklarının altında süzgeç satırı. */
export function RetailerStockTable({
  rows,
  loading,
  busy,
  filters,
  onFiltersChange,
  onSave,
}: Props) {
  // Onay tabloda tutulur: satır yalnız önerir, yazmayı kullanıcı onaylar.
  const [pending, setPending] = useState<PendingStockChange | null>(null);
  const [toDelete, setToDelete] = useState<PendingProductDelete | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className={TH}>Üretici Adı</th>
              <th className={TH}>Kategori</th>
              <th className={TH}>Model</th>
              <th className={TH}>Ürün Adı</th>
              <th className={TH}>Ölçüleri</th>
              <th className={`${TH} text-center`}>Miktarı</th>
            </tr>
            <tr className="border-t border-slate-100">
              {FILTER_KEYS.map(({ key, label }) => (
                <th key={key} className="px-3 py-2">
                  <input
                    type="text"
                    value={filters[key]}
                    aria-label={`${label} ara`}
                    onChange={(e) => onFiltersChange({ ...filters, [key]: e.target.value })}
                    placeholder="Ara..."
                    className="w-full min-w-20 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-normal text-slate-700 placeholder-slate-300 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  />
                </th>
              ))}
              <th className="px-3 py-2 text-center">
                {isStockFilterActive(filters) && (
                  <button
                    type="button"
                    onClick={() => onFiltersChange(EMPTY_STOCK_FILTERS)}
                    className="text-[9px] font-bold text-slate-500 underline underline-offset-2 hover:text-slate-800 focus:outline-none"
                  >
                    Temizle
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-xs font-medium text-slate-400">
                  {isStockFilterActive(filters)
                    ? 'Süzgeçle eşleşen ürün bulunamadı.'
                    : 'Tedarikçilerinizin aktif ürünü bulunmuyor.'}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <RetailerStockRow
                key={row.productId}
                row={row}
                busy={busy}
                onDelete={() =>
                  setToDelete({
                    productId: row.productId,
                    productName: row.name,
                    ownerOrgId: row.ownerOrgId,
                  })
                }
                onRequestSave={(quantity) =>
                  setPending({
                    productId: row.productId,
                    productName: row.name,
                    from: row.quantity,
                    to: quantity,
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {pending && (
        <ConfirmDialog
          title="Stoğu güncelle"
          message={<StockChangeMessage change={pending} />}
          confirmLabel="Evet, güncelle"
          pending={busy}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onSave(pending.productId, pending.to);
            setPending(null);
          }}
        />
      )}

      {toDelete && <StockDeleteDialog target={toDelete} onClose={() => setToDelete(null)} />}
    </div>
  );
}
