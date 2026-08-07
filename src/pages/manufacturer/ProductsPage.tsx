import { useState } from 'react';
import {
  ProductDialog,
  ProductTable,
  useProductCosts,
  useProducts,
  useSaveProduct,
  useSetProductActive,
  type CatalogProduct,
  type ProductForm,
} from '@/features/catalog';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

/** Üreticinin katalog yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function ProductsPage() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id ?? '';
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useProducts({ search });
  const products = list.data?.pages.flat() ?? [];
  // Maliyetler ayrı tablodan gelir (A4); perakendecide bu sorgu 0 satır döner.
  const costs = useProductCosts(products.map((p) => p.id));
  const save = useSaveProduct();
  const setActive = useSetProductActive();

  const close = () => {
    setEditing(null);
    setCreating(false);
    save.reset();
  };

  const submit = (v: ProductForm, images: string[]) => {
    save.mutate(
      {
        ...(editing ? { id: editing.id } : {}),
        name: v.name,
        code: v.code,
        supplierPrice: Number(v.supplierPrice),
        ...(v.costPrice === '' || v.costPrice === undefined
          ? {}
          : { costPrice: Number(v.costPrice) }),
        ...(v.description ? { description: v.description } : {}),
        images,
      },
      { onSuccess: close },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ürünlerim</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Satış fiyatını müşterileriniz görür. Maliyetiniz ayrı tutulur ve hiçbir
            perakendeciye gösterilmez.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Yeni ürün</Button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Ürün adı veya kodu"
        aria-label="Ürün ara"
        className="input max-w-xs"
      />

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <ProductTable
          products={products}
          costs={costs.data}
          busyId={busyId}
          onEdit={setEditing}
          onToggleActive={(p) => {
            setBusyId(p.id);
            setActive.mutate(
              { id: p.id, isActive: !p.isActive },
              { onSettled: () => setBusyId(undefined) },
            );
          }}
        />
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

      {(creating || editing) && (
        <ProductDialog
          product={editing ?? undefined}
          initialCost={editing ? costs.data?.[editing.id] : undefined}
          orgId={orgId}
          pending={save.isPending}
          errorMessage={save.isError ? 'Kaydedilemedi. Ürün kodu benzersiz olmalı.' : undefined}
          onClose={close}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
