import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useProducts, type CatalogProduct } from '../api/useProducts';
import { useProductGroups } from '../api/useProductGroups';
import { useProductStock } from '../api/useProductStock';
import { ProductCard } from './ProductCard';
import { ProductPreview } from './ProductPreview';

/**
 * Katalog kart ızgarası — kendi durumunu taşıyan kapsayıcı.
 *
 * Sayfa 150 satır bütçesinde (A19) ve bu ekranın arama, grup filtresi, ürün
 * önizlemesi ve sayfalama durumu var. Katman kuralı korunuyor: doğrudan
 * supabase çağrısı yok, yalnız bu feature'ın api hook'ları.
 */
export function CatalogGrid({ ownerOrgId }: { ownerOrgId: string }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<CatalogProduct | null>(null);

  const groupFilter = params.get('grup');
  const categoryFilter = params.get('kategori');
  const highlightId = params.get('urun');

  const list = useProducts({ ownerOrgId, activeOnly: true, search });
  const groups = useProductGroups(ownerOrgId);

  const all = list.data?.pages.flat() ?? [];
  const stock = useProductStock(all.map((p) => p.id));

  const groupName = new Map((groups.data ?? []).map((g) => [g.id, g.name]));

  // 'yok' = gruplanmamışlar; ayrı bir değer çünkü null bir URL parametresinde
  // "filtre yok" ile karışırdı.
  const products = all.filter((p) => {
    if (highlightId !== null && p.id !== highlightId) {
      return false;
    }
    if (categoryFilter !== null) {
      if (categoryFilter === 'yok' ? p.category !== null : p.category !== categoryFilter) {
        return false;
      }
    }
    if (groupFilter === null) return true;
    if (groupFilter === 'yok') return p.groupId === null;
    return p.groupId === groupFilter;
  });

  // Seçili ürün veya grup varsa rozette o yazar
  const activeFilterName =
    highlightId !== null
      ? (all.find((p) => p.id === highlightId)?.name ?? 'Seçili ürün')
      : categoryFilter !== null
        ? categoryFilter === 'yok'
          ? 'Kategorisiz'
          : categoryFilter
        : groupFilter === null
          ? null
          : groupFilter === 'yok'
            ? 'Gruplanmamış'
            : (groupName.get(groupFilter) ?? 'Seçili grup');

  return (
    <div className="space-y-5">
      {/* Arama kutusu perakendeci kataloğuyla aynı: iki ekran aynı işi yapıyor,
          aynı görünmeli. */}
      <div className="relative rounded-2xl border border-slate-100 bg-white p-2 shadow-md">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Ürün adı veya model ara..."
          aria-label="Ürün ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-xl border-none bg-transparent py-3 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
      </div>

      {activeFilterName && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
            {activeFilterName}
          </span>
          <Button variant="ghost" onClick={() => setParams({})}>
            Filtreyi kaldır
          </Button>
        </div>
      )}

      {list.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto size-10 text-slate-300"
            aria-hidden="true"
          >
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Ürün bulunamadı</h3>
            <p className="text-xs text-slate-400">Bu görünümde ürün yok.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              groupName={p.groupId ? (groupName.get(p.groupId) ?? null) : null}
              stock={stock.data?.[p.id] ?? null}
              highlighted={highlightId === p.id}
              onOpen={setPreview}
            />
          ))}
        </div>
      )}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            loading={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            Daha fazla yükle
          </Button>
        </div>
      )}

      {preview && (
        <ProductPreview
          product={preview}
          groupName={preview.groupId ? (groupName.get(preview.groupId) ?? null) : null}
          stock={stock.data?.[preview.id] ?? null}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
