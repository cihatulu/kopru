import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ManufacturerPicker, RetailerCatalogGrid, useProducts } from '@/features/catalog';
import { useCounterparties, type Edge } from '@/features/counterparties';
import { useCart } from '@/features/orders';
import { useAuthSession } from '@/features/auth';
import { ROUTES } from '@/constants';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

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
    ? edges.find((e) => e.manufacturerOrgId === paramManufacturerId || e.id === paramManufacturerId)
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

  // "Tüm Üreticiler" görünümünde satır hangi üreticiye ait olduğunu adıyla
  // taşır; sepet çakışma uyarısı kimlik değil ad gösterebilsin diye.
  const nameMap = useMemo(
    () => Object.fromEntries(edges.map((e) => [e.manufacturerOrgId, e.manufacturer.companyName])),
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
      <PageHeader
        title="Ürün Kataloğu"
        description="Tedarikçinizi seçin, ürünleri sepete ekleyin. Fiyatlar perakende satış fiyatlarınızdır."
        actions={
          <>
            {edges.length > 0 && (
              <ManufacturerPicker
                options={edges.map((e) => ({
                  id: e.id,
                  manufacturerOrgId: e.manufacturerOrgId,
                  companyName: e.manufacturer.companyName,
                }))}
                value={selected?.manufacturerOrgId ?? ''}
                onChange={(val) => {
                  setParams(val ? { manufacturerId: val } : {});
                  // Tedarikçi değişince sepet boşalır: iki üreticinin
                  // ürünü aynı siparişte olamaz.
                  clearCart();
                }}
              />
            )}

            {/* Sepet, katalogda ANA eylem değil — ürün eklemek asıl iş.
              Marka rengi kart içindeki "Sepete Ekle"ye ayrıldı; ikisi de
              birincil olunca kullanıcı hangisinin ana eylem olduğunu
              renkten ayırt edemiyordu. */}
            <Button variant="secondary" onClick={() => void navigate(`${ROUTES.retailer}/sepetim`)}>
              Sepetim ({totals.lineCount})
            </Button>
          </>
        }
      />

      {/* Ürün Listesi Izgarası */}
      <RetailerCatalogGrid
        products={products}
        discountRate={selected?.discountRate ?? 0}
        discountMap={discountMap}
        isSubscriber={user.org.isSubscriber}
        loading={list.isPending}
        onAdd={(p, unitPrice, supplierUnitPrice, customDescription, priceDifference) =>
          addCartLine({
            productId: p.id,
            supplierUnitPrice,
            // Sepet satırı hangi üreticiye ait olduğunu KENDİ taşır: "Tüm
            // Üreticiler" görünümünde seçili bir üretici yoktur.
            manufacturerOrgId: p.ownerOrgId,
            manufacturerName: nameMap[p.ownerOrgId],
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
