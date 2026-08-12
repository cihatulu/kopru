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
      <input
        className="input w-full rounded-xl px-4 py-3"
        placeholder="Ürün adı veya model ara…"
        aria-label="Ürün ara"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

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
        <p className="rounded-xl bg-white p-10 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
          Bu görünümde ürün yok.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
