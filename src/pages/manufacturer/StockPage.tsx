import { useState, useMemo, useRef } from 'react';
import {
  parseCsv,
  toCsv,
  useBulkUpdateStock,
  useSetProductStock,
  useStockList,
} from '@/features/stock';
import { useProductGroups } from '@/features/catalog/api/useProductGroups';
import { Spinner } from '@/components/ui/Spinner';
import { StockTable } from '@/features/stock/components/StockTable';

// --- Icons ---
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
  </svg>
);

export default function StockPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  // Filters & Pagination
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const list = useStockList(search);
  const groupsQuery = useProductGroups();
  const setStock = useSetProductStock();
  const bulk = useBulkUpdateStock();

  const rows = list.data ?? [];
  const groups = groupsQuery.data ?? [];

  // Group mapping helper
  const getProductGroupName = (groupId: string | null) => {
    return groups.find((g) => g.id === groupId)?.name || null;
  };

  // Categories list
  const categories = useMemo(() => {
    return [...new Set(rows.map((r) => r.category).filter(Boolean) as string[])];
  }, [rows]);

  // Client-side category filtering
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedCategory && r.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [rows, selectedCategory]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const currentProducts = useMemo(() => {
    return filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRows, currentPage]);

  const handleRefresh = () => {
    setSearch('');
    setSelectedCategory(null);
    setCurrentPage(1);
    setApplied(null);
    setErrorMessage(null);
  };

  const downloadTemplate = () => {
    setApplied(null);
    setErrorMessage(null);
    const csvRows = rows.map((r) => ({
      productId: r.productId,
      productName: r.name,
      productCode: r.code,
      category: r.category,
      groupName: getProductGroupName(r.groupId),
      quantity: r.quantity ?? 0,
    }));

    const csvContent = toCsv(csvRows);
    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `stok_listesi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApplied(null);
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const parsed = parseCsv(text);
        if (parsed.errors.length > 0) {
          setErrorMessage(
            `CSV dosyasında hatalar bulundu:\n` +
              parsed.errors.map((err) => `Satır ${err.line}: ${err.reason}`).join('\n')
          );
          return;
        }

        if (parsed.rows.length === 0) {
          setErrorMessage('Güncellenecek geçerli ürün verisi bulunamadı.');
          return;
        }

        bulk.mutate(parsed.rows, {
          onSuccess: (updatedCount) => {
            setApplied(updatedCount);
          },
          onError: () => {
            setErrorMessage('Toplu stok güncellemesi sırasında sunucu hatası oluştu.');
          },
        });
      } catch (err) {
        setErrorMessage('Dosya ayrıştırılırken beklenmeyen bir hata oluştu.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stok Yönetimi</h1>
          <p className="text-slate-500 text-xs mt-1">Ürün stoklarınızı Excel şablonu ile toplu olarak hızlıca güncelleyin.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 flex-shrink-0">
          <button
            onClick={downloadTemplate}
            disabled={rows.length === 0}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
          >
            <DownloadIcon />
            Şablon İndir
          </button>
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <span className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95">
                <FileIcon />
                Dosya Yükle
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-150 flex items-start gap-3.5 text-left">
        <div className="flex-shrink-0 mt-0.5"><InfoIcon /></div>
        <div>
          <h3 className="text-blue-900 font-bold text-xs mb-1.5 uppercase tracking-wider">Nasıl Kullanılır?</h3>
          <ol className="list-decimal list-inside text-xs text-blue-800 space-y-1.5 leading-relaxed font-semibold">
            <li><span className="font-bold">"Şablon İndir"</span> butonuna basarak güncel listenizi bilgisayarınıza kaydedin.</li>
            <li>Excel veya benzeri bir yazılımla dosyayı açın, <span className="font-bold">"Mevcut Stok"</span> alanlarını düzenleyin.</li>
            <li>Ürünleri gruplamak isterseniz <span className="font-bold">"Grup Adı"</span> sütununa grup adını yazın.</li>
            <li><span className="font-bold">"Dosya Yükle"</span> butonuna tıklayıp düzenlediğiniz CSV dosyasını sisteme yükleyin.</li>
          </ol>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-col transition-all">
        <div className="flex items-center justify-between">
          <div className="relative flex-grow max-w-lg flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Ürün adı, model veya kod ara..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full pl-10 pr-3 py-2 text-xs border-none rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 bg-transparent font-medium"
            />
          </div>
          <div className="flex items-center gap-1.5 pr-1 border-l border-slate-100 pl-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isFilterOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Filtrele"
            >
              <FilterIcon />
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              title="Yenile"
            >
              <RefreshIcon />
            </button>
          </div>
        </div>

        {/* Expanded Filter Panel */}
        {isFilterOpen && (
          <div className="border-t border-slate-50 mt-2 pt-3 px-2 pb-1.5 text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Kategoriye Göre Filtrele</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  selectedCategory === null
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-150 text-slate-650 hover:bg-slate-100'
                }`}
              >
                Tümü
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat === selectedCategory ? null : cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 border-blue-600 text-white font-extrabold'
                      : 'bg-slate-50 border-slate-150 text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {applied !== null && (
        <div role="alert" className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-xs font-extrabold border border-emerald-100 shadow-sm">
          ✅ {applied} adet ürünün stoğu başarıyla güncellendi.
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="bg-rose-50 text-rose-700 p-4 rounded-xl text-xs font-bold border border-rose-100 shadow-sm whitespace-pre-line leading-relaxed">
          ❌ {errorMessage}
        </div>
      )}

      {setStock.isError && (
        <div role="alert" className="bg-rose-50 text-rose-700 p-4 rounded-xl text-xs font-bold border border-rose-100 shadow-sm">
          ❌ Stok güncellenirken bir hata oluştu.
        </div>
      )}

      {/* Stock Table */}
      {list.isPending || groupsQuery.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <StockTable
            rows={currentProducts}
            groups={groups}
            busyId={busyId}
            onSave={(productId, quantity) => {
              setBusyId(productId);
              setStock.mutate(
                { productId, quantity },
                {
                  onSuccess: () => {
                    setApplied(1);
                  },
                  onSettled: () => setBusyId(undefined),
                }
              );
            }}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-5 py-4 border border-slate-100 bg-white rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium">
                Toplam {filteredRows.length} sonuçtan {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredRows.length)} arası gösteriliyor
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium cursor-pointer"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                      currentPage === page
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium cursor-pointer"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
