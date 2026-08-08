import { useState } from 'react';
import {
  CsvImportDialog,
  StockTable,
  toCsv,
  useBulkUpdateStock,
  useSetProductStock,
  useStockList,
} from '@/features/stock';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

/** Stok Yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function StockPage() {
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useStockList(search);
  const setStock = useSetProductStock();
  const bulk = useBulkUpdateStock();

  const rows = list.data ?? [];

  const downloadTemplate = () => {
    const csv = toCsv(
      rows.map((r) => ({
        productId: r.productId,
        productCode: r.code,
        productName: r.name,
        quantity: r.quantity ?? 0,
      })),
    );
    // Şablon mevcut stokla dolu iner: kullanıcı yalnız değişenleri düzeltsin,
    // boş bir dosyayı elle doldurmak zorunda kalmasın.
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `stok-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Stok Yönetimi</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Stok, sipariş akışında otomatik düşer. Buradaki düzenleme sayım farkı gibi
            sipariş dışı düzeltmeler içindir.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={rows.length === 0} onClick={downloadTemplate}>
            Şablon indir
          </Button>
          <Button onClick={() => setImporting(true)}>CSV yükle</Button>
        </div>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Ürün adı veya kodu"
        aria-label="Ürün ara"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {setStock.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Stok güncellenemedi.
        </p>
      )}

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <StockTable
          rows={rows}
          busyId={busyId}
          onSave={(productId, quantity) => {
            setBusyId(productId);
            setStock.mutate(
              { productId, quantity },
              { onSettled: () => setBusyId(undefined) },
            );
          }}
        />
      )}

      {importing && (
        <CsvImportDialog
          pending={bulk.isPending}
          appliedCount={applied}
          onClose={() => {
            setImporting(false);
            setApplied(null);
            bulk.reset();
          }}
          onApply={(csvRows) => bulk.mutate(csvRows, { onSuccess: setApplied })}
        />
      )}
    </div>
  );
}
