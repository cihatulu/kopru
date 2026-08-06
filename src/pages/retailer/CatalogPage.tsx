import { useState } from 'react';
import { CatalogRow, discountedPrice, useProducts } from '@/features/catalog';
import { PartyPicker, useCounterparties, type Edge } from '@/features/counterparties';
import {
  CartPanel,
  addLine,
  setQuantity,
  setRetailPrice,
  usePlaceOrder,
  type CartLine,
} from '@/features/orders';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';

/** Perakendecinin katalog + sepet ekranı — YALNIZ KOMPOZİSYON (A20). */
export default function CatalogPage() {
  const { data: user } = useAuthSession();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [placed, setPlaced] = useState(false);

  const suppliers = useCounterparties();
  const place = usePlaceOrder();

  const edges: Edge[] = (suppliers.data?.pages.flat() ?? []).filter((e) => e.status === 'active');
  const selected = edges.find((e) => e.id === supplierId) ?? edges[0];

  const list = useProducts({
    ...(selected ? { ownerOrgId: selected.manufacturerOrgId } : {}),
    activeOnly: true,
  });
  const products = selected ? (list.data?.pages.flat() ?? []) : [];

  if (!user?.org) return null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Katalog</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tedarikçinizi seçin, ürünleri sepete ekleyin. Fiyatlar iskontonuz uygulanmış hâlidir.
        </p>
      </div>

      <PartyPicker
        edges={edges}
        myOrgId={user.org.id}
        selectedId={selected?.id}
        showDiscount
        emptyText="Aktif tedarikçiniz yok. Tedarikçilerim sekmesinden ekleyebilirsiniz."
        onSelect={(e) => {
          setSupplierId(e.id);
          setLines([]);
          setPlaced(false);
        }}
      />

      {placed && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Siparişiniz alındı. Siparişlerim sekmesinden takip edebilirsiniz.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {list.isPending && selected ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : products.length === 0 ? (
            <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
              Bu tedarikçinin aktif ürünü yok.
            </p>
          ) : (
            products.map((p) => {
              const unit = discountedPrice(p.supplierPrice, selected?.discountRate ?? 0);
              return (
                <CatalogRow
                  key={p.id}
                  product={p}
                  unitPrice={unit}
                  onAdd={() =>
                    setLines((prev) =>
                      addLine(prev, {
                        productId: p.id,
                        name: p.name,
                        code: p.code,
                        unitPrice: unit,
                        quantity: 1,
                      }),
                    )
                  }
                />
              );
            })
          )}
        </div>

        <CartPanel
          lines={lines}
          pending={place.isPending}
          errorMessage={place.isError ? 'Sipariş verilemedi. Tekrar deneyin.' : undefined}
          onQuantity={(id, q) => setLines((prev) => setQuantity(prev, id, q))}
          onRetailPrice={(id, price) => setLines((prev) => setRetailPrice(prev, id, price))}
          onSubmit={() => {
            if (!selected) return;
            place.mutate(
              { relationshipId: selected.id, lines },
              {
                onSuccess: () => {
                  setLines([]);
                  setPlaced(true);
                },
              },
            );
          }}
        />
      </div>
    </div>
  );
}
