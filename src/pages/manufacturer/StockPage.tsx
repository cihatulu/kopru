import { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { downloadCsvText } from '@/lib/csv';
import { useProductGroups } from '@/features/catalog';
import {
  CsvImportDialog,
  StockHeader,
  StockHowToBanner,
  StockTable,
  StockToolbar,
  filterByCategory,
  pageSlice,
  toStockCsv,
  uniqueCategories,
  useBulkUpdateStock,
  useSetProductStock,
  useStockList,
} from '@/features/stock';

const PER_PAGE = 10;

/** Üretici Stok Yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function StockPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useStockList(search);
  const groupsQuery = useProductGroups();
  const setStock = useSetProductStock();
  const bulk = useBulkUpdateStock();

  const all = useMemo(() => list.data ?? [], [list.data]);
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);

  const categories = useMemo(() => uniqueCategories(all), [all]);
  const rows = useMemo(() => filterByCategory(all, category), [all, category]);
  const visible = useMemo(() => pageSlice(rows, page, PER_PAGE), [rows, page]);

  return (
    <div className="space-y-6 text-slate-800">
      <StockHeader
        exportDisabled={all.length === 0}
        onExport={() =>
          downloadCsvText(
            toStockCsv(all, groups),
            `stok_listesi-${new Date().toISOString().slice(0, 10)}.csv`,
          )
        }
        onImport={() => {
          setApplied(null);
          setImporting(true);
        }}
      />

      <StockHowToBanner />

      <StockToolbar
        search={search}
        categories={categories}
        selectedCategory={category}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onCategoryChange={(v) => {
          setCategory(v);
          setPage(1);
        }}
        onReset={() => {
          setSearch('');
          setCategory(null);
          setPage(1);
        }}
      />

      {list.isError && (
        <p role="alert" className="text-sm font-bold text-red-600">
          Stok listesi yüklenemedi.
        </p>
      )}

      {setStock.isError && (
        <p role="alert" className="text-sm font-bold text-red-600">
          Stok güncellenirken bir hata oluştu.
        </p>
      )}

      {list.isPending || groupsQuery.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <StockTable
            rows={visible}
            groups={groups}
            busyId={busyId}
            onSave={(productId, quantity) => {
              setBusyId(productId);
              setStock.mutate({ productId, quantity }, { onSettled: () => setBusyId(undefined) });
            }}
          />
          <Pagination
            page={page}
            pageSize={PER_PAGE}
            total={rows.length}
            onChange={setPage}
          />
        </div>
      )}

      {importing && (
        <CsvImportDialog
          pending={bulk.isPending}
          appliedCount={applied}
          onClose={() => setImporting(false)}
          onApply={(csvRows) => bulk.mutate(csvRows, { onSuccess: (count) => setApplied(count) })}
        />
      )}
    </div>
  );
}
