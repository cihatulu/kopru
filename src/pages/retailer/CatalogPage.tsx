import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RetailerCatalogGrid, useProducts } from '@/features/catalog';
import { useCounterparties, type Edge } from '@/features/counterparties';
import { useCart } from '@/features/orders';
import { useAuthSession } from '@/features/auth';
import { ROUTES } from '@/constants';
import { Button } from '@/components/ui/Button';

/** Perakendecinin katalog ekranı — YALNIZ KOMPOZİSYON (A20). */
export default function CatalogPage() {
  const { data: user } = useAuthSession();
  const { addCartLine, clearCart, totals } = useCart();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const suppliers = useCounterparties();
  const edges: Edge[] = (suppliers.data?.pages.flat() ?? []).filter((e) => e.status === 'active');

  const paramManufacturerId = params.get('manufacturerId') ?? params.get('uretici');
  const paramGroupId = params.get('groupId') ?? params.get('grup');
  const paramCategory = params.get('category') ?? params.get('kategori');
  const paramProductId = params.get('productId') ?? params.get('urun');

  const selected = paramManufacturerId
    ? edges.find(
        (e) => e.manufacturerOrgId === paramManufacturerId || e.id === paramManufacturerId,
      )
    : undefined;

  const list = useProducts({
    ...(selected ? { ownerOrgId: selected.manufacturerOrgId } : {}),
    activeOnly: true,
  });

  const allProducts = list.data?.pages.flat() ?? [];

  const discountMap = useMemo(
    () => Object.fromEntries(edges.map((e) => [e.manufacturerOrgId, e.discountRate ?? 0])),
    [edges],
  );

  // Gruplara, kategorilere veya tek ürüne göre süzme
  const products = allProducts.filter((p) => {
    if (paramGroupId && paramGroupId !== 'yok' && p.groupId !== paramGroupId) return false;
    if (paramGroupId === 'yok' && p.groupId !== null) return false;
    if (paramCategory && paramCategory !== 'yok' && p.category !== paramCategory) return false;
    if (paramCategory === 'yok' && p.category !== null) return false;
    if (paramProductId && p.id !== paramProductId) return false;
    return true;
  });

  if (!user?.org) return null;

  return (
    <div className="space-y-6">
      {/* Üst Başlık, Üretici Seçimi ve Sepet Butonu */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Ürün Kataloğu</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Tedarikçinizi seçin, ürünleri sepete ekleyin. Fiyatlar perakende satış fiyatlarınızdır.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {edges.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ÜRETİCİ:</span>
              <select
                value={selected?.manufacturerOrgId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setParams({});
                  } else {
                    const next = edges.find((edge) => edge.manufacturerOrgId === val);
                    if (next) {
                      setParams({ manufacturerId: next.manufacturerOrgId });
                    }
                  }
                  clearCart();
                }}
                className="cursor-pointer bg-transparent py-1 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="">Tüm Üreticiler</option>
                {edges.map((e) => (
                  <option key={e.id} value={e.manufacturerOrgId}>
                    {e.manufacturer.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="primary"
            onClick={() => void navigate(`${ROUTES.retailer}/sepetim`)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl shadow-sm text-xs"
          >
            Sepetim ({totals.lineCount})
          </Button>
        </div>
      </div>

      {/* Ürün Listesi Izgarası */}
      <RetailerCatalogGrid
        products={products}
        discountRate={selected?.discountRate ?? 0}
        discountMap={discountMap}
        isSubscriber={user.org.isSubscriber}
        loading={list.isPending}
        onAdd={(p, unitPrice, customDescription, priceDifference) =>
          addCartLine({
            productId: p.id,
            // Sepet satırı hangi üreticiye ait olduğunu KENDİ taşır: "Tüm
            // Üreticiler" görünümünde seçili bir üretici yoktur.
            manufacturerOrgId: p.ownerOrgId,
            name: p.name,
            code: p.code,
            imageUrl: p.images[0],
            model: p.code,
            unitPrice,
            quantity: 1,
            customDescription,
            priceDifference,
          })
        }
      />
    </div>
  );
}
