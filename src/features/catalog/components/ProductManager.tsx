import { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ListFooter } from '@/components/ui/ListFooter';
import { useProducts, useProductCosts, type CatalogProduct } from '../api/useProducts';
import { useProductStock } from '../api/useProductStock';
import { useProductGroups } from '../api/useProductGroups';
import { useAuthSession } from '@/features/auth';
import { useCatalogAdmin } from '../api/useCatalogAdmin';
import { ProductError } from '../domain/productErrors';
import {
  collectCategories,
  computeStats,
  filterProducts,
  toggleInSet,
  type ActivityFilter,
  type StockFilter,
} from '../domain/productStats';
import { toSavePayload, toSetSavePayload } from '../domain/submitMapping';
import { ProductStatCards } from './ProductStatCards';
import { ProductHeaderActions } from './ProductHeaderActions';
import { ProductFilterBar } from './ProductFilterBar';
import { ProductTable } from './ProductTable';
import { ProductDialogs, type ProductDialogKind } from './ProductDialogs';

/** Ürün Yönetimi — durum burada, sayfa yalnız kompozisyon (A19/A20). */
export function ProductManager({ orgId }: { orgId: string }) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  // Varsayılan AKTİF: üretici günlük işini aktif katalogla yapar.
  const [activity, setActivity] = useState<ActivityFilter>('active');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<ProductDialogKind>('none');
  const [editing, setEditing] = useState<CatalogProduct | undefined>(undefined);
  const [deleting, setDeleting] = useState<CatalogProduct | null>(null);

  const list = useProducts({ ownerOrgId: orgId, search });
  const groups = useProductGroups(orgId);
  const all = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);
  const ids = useMemo(() => all.map((p) => p.id), [all]);
  const costs = useProductCosts(ids);
  const stock = useProductStock(ids);
  const admin = useCatalogAdmin();
  const session = useAuthSession();
  // Kalıcı silme yalnız org SAHİBİNDE; sunucu da ayrıca doğrular.
  const canDelete = session.data?.orgRole === 'owner';
  const isSubscriber = session.data?.org?.isSubscriber ?? true;
  const isGuestManufacturer = session.data?.org?.kind === 'manufacturer' && !isSubscriber;

  const visible = filterProducts(
    all,
    { group: groupFilter, category: categoryFilter, stock: stockFilter, activity },
    (id) => stock.data?.[id] ?? null,
  );
  const categories = collectCategories(all);

  const stats = computeStats(
    all.map((p) => ({ price: p.supplierPrice, quantity: stock.data?.[p.id] ?? null })),
  );
  const selected = all.filter((p) => selectedIds.has(p.id));

  const close = () => {
    setDialog('none');
    setEditing(undefined);
    admin.saveProduct.reset();
  };

  return (
    <div className="space-y-6">
      <ProductHeaderActions
        activity={activity}
        onActivityChange={setActivity}
        selectedCount={selectedIds.size}
        selectedSingleCount={selected.filter((p) => p.type === 'single').length}
        groups={groups.data ?? []}
        isGuest={isGuestManufacturer}
        onAssignGroup={() => setDialog('group-assign')}
        onManageGroups={() => setDialog('group-manage')}
        onCreateSet={() => setDialog('set')}
        onAddProduct={() => {
          setEditing(undefined);
          setDialog('product');
        }}
      />

      <ProductStatCards stats={stats} />

      <ProductFilterBar
        search={search}
        groupFilter={groupFilter}
        categoryFilter={categoryFilter}
        categories={categories}
        stockFilter={stockFilter}
        groups={groups.data ?? []}
        onSearch={setSearch}
        onGroupFilter={setGroupFilter}
        onCategoryFilter={setCategoryFilter}
        onStockFilter={setStockFilter}
      />

      {list.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <ProductTable
          products={visible}
          costs={costs.data}
          stock={stock.data}
          groupNames={new Map((groups.data ?? []).map((g) => [g.id, g.name]))}
          canDelete={canDelete}
          selectedIds={selectedIds}
          isGuest={isGuestManufacturer}
          onSaveCost={(productId, costPrice) =>
            admin.saveCost.mutate({ productId, ownerOrgId: orgId, costPrice })
          }
          onToggleOne={(id) => setSelectedIds((prev) => toggleInSet(prev, id))}
          onToggleAll={(rowIds, selectAll) =>
            setSelectedIds(selectAll ? new Set(rowIds) : new Set())
          }
          onEdit={(p) => {
            setEditing(p);
            setDialog('product');
          }}
          onToggleActive={(p) => admin.setActive.mutate({ id: p.id, isActive: !p.isActive })}
          onDelete={setDeleting}
        />
      )}

      <ListFooter
        label={`Toplam ${visible.length} ürün listeleniyor`}
        hasMore={list.hasNextPage}
        loading={list.isFetchingNextPage}
        onLoadMore={() => void list.fetchNextPage()}
      />

      <ProductDialogs
        kind={dialog}
        orgId={orgId}
        groups={groups.data ?? []}
        allProducts={all}
        categories={categories}
        selected={selected}
        costs={costs.data}
        stock={stock.data}
        editing={editing}
        deleting={deleting}
        savePending={admin.saveProduct.isPending}
        saveError={
          admin.saveProduct.error instanceof ProductError ? admin.saveProduct.error.message : null
        }
        deleteError={
          admin.deleteProduct.error instanceof ProductError
            ? admin.deleteProduct.error.message
            : null
        }
        groupPending={admin.groupPending}
        deletePending={admin.deleteProduct.isPending}
        onClose={close}
        onCloseDelete={() => setDeleting(null)}
        onSubmitProduct={(payload) =>
          admin.saveProduct.mutate(toSavePayload(payload, editing?.id), { onSuccess: close })
        }
        onSubmitSet={(v) =>
          admin.saveProduct.mutate(toSetSavePayload(v), {
            onSuccess: () => {
              setSelectedIds(new Set());
              close();
            },
          })
        }
        onAssign={(choice) => {
          const productIds = [...selectedIds];
          const done = { onSuccess: () => setDialog('none') };
          if (choice.groupId) {
            admin.assignGroup.mutate({ productIds, groupId: choice.groupId }, done);
          } else if (choice.newName) {
            admin.assignToNew.mutate({ name: choice.newName, productIds }, done);
          }
        }}
        onCreateGroup={(name) => admin.saveGroup.mutate({ name })}
        onRenameGroup={(id, name) => admin.saveGroup.mutate({ id, name })}
        onDeleteGroup={(id) => admin.deleteGroup.mutate({ id })}
        onSetMembers={(groupId, productIds) => admin.setMembers.mutate({ groupId, productIds })}
        onConfirmDelete={() =>
          deleting &&
          admin.deleteProduct.mutate({ id: deleting.id }, { onSuccess: () => setDeleting(null) })
        }
      />
    </div>
  );
}
