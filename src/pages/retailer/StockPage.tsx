import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { downloadBlob } from '@/lib/csv';
import {
  CsvImportDialog,
  EMPTY_STOCK_FILTERS,
  RetailerStockTable,
  filterStockRows,
  toXlsxBlob,
  useBulkUpdateRetailerStock,
  useRetailerStockList,
  useSetRetailerStock,
  type BulkStockResult,
  type StockFilters,
} from '@/features/stock';
import { catalogEditableSuppliers, useCounterparties } from '@/features/counterparties';

/** Perakendeci Stok Yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function RetailerStockPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StockFilters>(EMPTY_STOCK_FILTERS);
  const [importing, setImporting] = useState(false);
  const [applied, setApplied] = useState<BulkStockResult | null>(null);

  const list = useRetailerStockList(search);
  const setStock = useSetRetailerStock();
  const bulk = useBulkUpdateRetailerStock();
  const counterparties = useCounterparties();

  // Yeni ürün YALNIZ izin verilmiş misafir üreticinin kataloğuna açılabilir.
  const suppliers = useMemo(
    () => catalogEditableSuppliers(counterparties.data?.pages.flat() ?? []),
    [counterparties.data],
  );

  const all = useMemo(() => list.data ?? [], [list.data]);
  const rows = useMemo(() => filterStockRows(all, filters), [all, filters]);

  const exportXlsx = () =>
    void downloadBlob(
      toXlsxBlob(
        all.map((r) => ({
          productId: r.productId,
          productName: r.name,
          productCode: r.code,
          category: r.category,
          // Perakendecide grup yerine üretici adı anlamlı: aynı ürün adı farklı
          // üreticilerde tekrar edebilir, dosyada ayırt edilebilmeli.
          groupName: r.manufacturerName,
          quantity: r.quantity ?? 0,
        })),
      ),
      `stok_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Stok Yönetimi</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Kendi deponuzdaki adetleri girin. Bu sayılar yalnız size görünür; tedarikçinizin
            stoğundan bağımsızdır.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportXlsx} disabled={all.length === 0}>
            Excel Dışa Aktar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setApplied(null);
              setImporting(true);
            }}
          >
            Excel ile Yükle
          </Button>
        </div>
      </div>

      <div className="relative rounded-2xl border border-slate-100 bg-white p-2 shadow-md">
        <input
          type="text"
          placeholder="Ürün adı veya model ara..."
          aria-label="Ürün ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-xl border-none bg-transparent px-3 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
      </div>

      {list.isError && (
        <p role="alert" className="text-sm font-bold text-red-600">
          Stok listesi yüklenemedi.
        </p>
      )}

      <RetailerStockTable
        rows={rows}
        loading={list.isPending}
        busy={setStock.isPending || bulk.isPending}
        filters={filters}
        onFiltersChange={setFilters}
        onSave={(productId, quantity) => setStock.mutate({ productId, quantity })}
      />

      <p className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
        Toplam {rows.length} ürün
      </p>

      {importing && (
        <CsvImportDialog
          pending={bulk.isPending}
          appliedCount={applied?.updated ?? null}
          createdCount={applied?.created ?? null}
          canCreateProducts
          manufacturers={suppliers}
          onClose={() => setImporting(false)}
          onApply={(csvRows, manufacturerOrgId) =>
            bulk.mutate({ rows: csvRows, manufacturerOrgId }, { onSuccess: setApplied })
          }
        />
      )}
    </div>
  );
}
