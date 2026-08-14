import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  CsvImportDialog,
  EMPTY_STOCK_FILTERS,
  RetailerStockTable,
  filterStockRows,
  toCsv,
  useBulkUpdateRetailerStock,
  useRetailerStockList,
  useSetRetailerStock,
  type StockFilters,
} from '@/features/stock';

/** Perakendeci Stok Yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function RetailerStockPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StockFilters>(EMPTY_STOCK_FILTERS);
  const [importing, setImporting] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);

  const list = useRetailerStockList(search);
  const setStock = useSetRetailerStock();
  const bulk = useBulkUpdateRetailerStock();

  const all = useMemo(() => list.data ?? [], [list.data]);
  const rows = useMemo(() => filterStockRows(all, filters), [all, filters]);

  const exportCsv = () => {
    const csv = toCsv(
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
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `stok_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={all.length === 0}>
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
          appliedCount={applied}
          onClose={() => setImporting(false)}
          onApply={(csvRows) =>
            bulk.mutate(csvRows, { onSuccess: (count) => setApplied(count) })
          }
        />
      )}
    </div>
  );
}
