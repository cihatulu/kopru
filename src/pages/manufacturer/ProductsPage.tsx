import { useState } from 'react';
import {
  GroupManager,
  ProductDialog,
  ProductTable,
  ProductToolbar,
  toSavePayload,
  useDeleteProductGroup,
  useProductCosts,
  useProductGroups,
  useProductStock,
  useProducts,
  useSaveProduct,
  useSaveProductGroup,
  useSetProductActive,
  type CatalogProduct,
  type ProductSubmit,
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
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useProducts({ search });
  const products = list.data?.pages.flat() ?? [];
  const ids = products.map((p) => p.id);
  // Maliyet ve stok ayrı tablolardan gelir (A4).
  const costs = useProductCosts(ids);
  const stock = useProductStock(ids);
  const groups = useProductGroups();

  const save = useSaveProduct();
  const setActive = useSetProductActive();
  const saveGroup = useSaveProductGroup();
  const deleteGroup = useDeleteProductGroup();

  const close = () => {
    setEditing(null);
    setCreating(false);
    save.reset();
  };

  return (
    <div className="space-y-5">
      <ProductToolbar
        search={search}
        onSearchChange={setSearch}
        onOpenGroups={() => setGroupsOpen(true)}
        onCreate={() => setCreating(true)}
      />

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <ProductTable
          products={products}
          costs={costs.data}
          stock={stock.data}
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
          initialStock={editing ? stock.data?.[editing.id] : undefined}
          orgId={orgId}
          groups={groups.data ?? []}
          allProducts={products}
          pending={save.isPending}
          errorMessage={save.isError ? 'Kaydedilemedi. Ürün kodu benzersiz olmalı.' : undefined}
          onClose={close}
          onSubmit={(p: ProductSubmit) =>
            save.mutate(toSavePayload(p, editing?.id), { onSuccess: close })
          }
        />
      )}

      {groupsOpen && (
        <GroupManager
          groups={groups.data ?? []}
          pending={saveGroup.isPending || deleteGroup.isPending}
          onSave={(input) => saveGroup.mutate(input)}
          onDelete={(id) => deleteGroup.mutate(id)}
          onClose={() => setGroupsOpen(false)}
        />
      )}
    </div>
  );
}
