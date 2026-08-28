import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RetailerStockRow } from './RetailerStockRow';
import { StockChangeMessage, type PendingStockChange } from './StockChangeMessage';
import { StockDeleteDialog, type PendingProductDelete } from './StockDeleteDialog';
import {
  EMPTY_STOCK_FILTERS,
  dimensionsText,
  isStockFilterActive,
  type StockFilters,
} from '../domain/retailerStockFilter';
import type { RetailerStockRow as Row } from '../api/useRetailerStockList';
import { parseQuantity } from '../domain/csv';

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

/** Perakendeci stok tablosu — Masaüstünde filtreli tablo, mobilde Akıllı Kartlar. */
export function RetailerStockTable({
  rows,
  loading,
  busy,
  filters,
  onFiltersChange,
  onSave,
}: Props) {
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
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-400">
            {isStockFilterActive(filters)
              ? 'Süzgeçle eşleşen ürün bulunamadı.'
              : 'Tedarikçilerinizin aktif ürünü bulunmuyor.'}
          </div>
        )}

        {rows.map((row) => {
          const dims = dimensionsText(row) || '—';
          return (
            <div
              key={row.productId}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
            >
              {/* Kart Başlığı: Üretici + Ürün Adı + Kod + Stok Girişi */}
              <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-brand-600">
                    {row.manufacturerName}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-sm font-bold text-slate-900 truncate" title={row.name}>
                      {row.name}
                    </span>
                    {!row.isActive && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600">
                        Pasif
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-slate-400">{row.code || '—'}</p>
                </div>

                {/* Stok Düzenleme Kutusu */}
                <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Stok Adedi
                  </span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={row.quantity === null ? '' : row.quantity}
                    disabled={busy}
                    placeholder="0"
                    onBlur={(e) => {
                      const parsed = parseQuantity(e.target.value);
                      if (parsed !== null && parsed !== row.quantity && !busy) {
                        setPending({
                          productId: row.productId,
                          productName: row.name,
                          from: row.quantity,
                          to: parsed,
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    className="w-20 text-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-extrabold text-slate-900 shadow-2xs focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  />
                </div>
              </div>

              {/* Kart Detay Izgarası */}
              <div className="grid grid-cols-2 gap-2.5 py-3 text-xs bg-slate-50/60 rounded-xl p-2.5 my-3 border border-slate-100">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Kategori
                  </span>
                  <span className="font-bold text-slate-700 block mt-0.5">
                    {row.category || '—'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Ölçüler (E x B x Y)
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-700 block mt-0.5">
                    {dims}
                  </span>
                </div>
              </div>

              {/* Pasif + Yönetilen Katalog Satırında Silme */}
              {!row.isActive && row.managed && (
                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() =>
                      setToDelete({
                        productId: row.productId,
                        productName: row.name,
                        ownerOrgId: row.ownerOrgId,
                      })
                    }
                    disabled={busy}
                    className="rounded-lg px-3 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                  >
                    Ürünü Sil
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Filtreli Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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

      {toDelete && (
        <StockDeleteDialog target={toDelete} onClose={() => setToDelete(null)} />
      )}
    </div>
  );
}
