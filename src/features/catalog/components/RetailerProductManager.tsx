import { useMemo, useState } from 'react';
import { useProducts, type CatalogProduct } from '../api/useProducts';
import { useProductStock } from '../api/useProductStock';
import { useProductGroups } from '../api/useProductGroups';
import { useRetailPrices } from '../api/useRetailPrices';
import { useRetailerCatalogWrites } from '../api/useRetailerCatalogWrites';
import {
  collectCategories,
  filterProducts,
  toggleInSet,
  type ActivityFilter,
  type StockFilter,
} from '../domain/productStats';
import { ProductFilterBar } from './ProductFilterBar';
import { ProductDialogs, type ProductDialogKind } from './ProductDialogs';
import { RetailerCatalogToolbar } from './RetailerCatalogToolbar';
import { RetailerProductTable } from './RetailerProductTable';
import { toSavePayload, toSetSavePayload } from '../domain/submitMapping';

interface Props {
  manufacturerId: string;
  isGuest: boolean;
  canEditCatalog: boolean;
}

export function RetailerProductManager({ manufacturerId, isGuest, canEditCatalog }: Props) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [activity, setActivity] = useState<ActivityFilter>('active');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<ProductDialogKind>('none');
  const [editing, setEditing] = useState<CatalogProduct | undefined>(undefined);
  const [deleting, setDeleting] = useState<CatalogProduct | null>(null);

  // Perakendeci, üreticinin ürünlerini çeker
  const list = useProducts({ ownerOrgId: manufacturerId, search });
  const groups = useProductGroups(manufacturerId);
  const all = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);
  const ids = useMemo(() => all.map((p) => p.id), [all]);
  const stock = useProductStock(ids);
  const retailPrices = useRetailPrices(ids);

  const writes = useRetailerCatalogWrites(manufacturerId);
  const admin = writes.admin;

  // Sadece Guest üretici ise kalıcı silme vs yapılabilir.
  const canDelete = isGuest && !canEditCatalog;

  const visible = filterProducts(
    all,
    { group: groupFilter, category: categoryFilter, stock: stockFilter, activity },
    (id) => stock.data?.[id] ?? null,
  );
  const categories = collectCategories(all);

  const selected = all.filter((p) => selectedIds.has(p.id));

  const close = () => {
    setDialog('none');
    setEditing(undefined);
    admin.saveProduct.reset();
  };

  const saveErrorMessage =
    admin.saveProduct.error instanceof Error ? admin.saveProduct.error.message : null;
  const deleteErrorMessage =
    admin.deleteProduct.error instanceof Error ? admin.deleteProduct.error.message : null;

  return (
    <div className="space-y-6">
      {isGuest && !canEditCatalog && (
        <RetailerCatalogToolbar
          activity={activity}
          onActivityChange={setActivity}
          onManageGroups={() => setDialog('group-manage')}
          onCreateSet={() => setDialog('set')}
          onAddProduct={() => {
            setEditing(undefined);
            setDialog('product');
          }}
        />
      )}

      <ProductFilterBar
        search={search}
        groupFilter={groupFilter}
        categoryFilter={categoryFilter}
        categories={categories}
        groups={groups.data ?? []}
        stockFilter={stockFilter}
        onSearch={setSearch}
        onGroupFilter={setGroupFilter}
        onCategoryFilter={setCategoryFilter}
        onStockFilter={setStockFilter}
      />

      <RetailerProductTable
        products={visible}
        stock={stock.data}
        retailPrices={retailPrices.data}
        groupNames={new Map((groups.data ?? []).map((g) => [g.id, g.name]))}
        canDelete={canDelete}
        canEdit={isGuest && !canEditCatalog}
        selectedIds={selectedIds}
        onToggleOne={(id) => setSelectedIds((prev) => toggleInSet(prev, id))}
        onToggleAll={(pageIds, selectAll) => {
          // Sayfa sayfa seçim: diğer sayfalarda seçili kalanlar korunur.
          const next = new Set(selectedIds);
          for (const id of pageIds) {
            if (selectAll) next.add(id);
            else next.delete(id);
          }
          setSelectedIds(next);
        }}
        onEdit={(p) => {
          setEditing(p);
          setDialog('product');
        }}
        onToggleActive={(p) =>
          admin.setActive.mutate({ id: p.id, isActive: !p.isActive, ownerOrgId: manufacturerId })
        }
        onDelete={(p) => setDeleting(p)}
        onUpdateRetailPrice={writes.updateRetailPrice}
      />

      <ProductDialogs
        kind={dialog}
        orgId={manufacturerId}
        editing={editing}
        deleting={deleting}
        groups={groups.data ?? []}
        allProducts={all}
        categories={categories}
        selected={selected}
        costs={retailPrices.data}
        stock={stock.data}
        isRetailer={true}
        savePending={admin.saveProduct.isPending}
        deletePending={admin.deleteProduct.isPending}
        saveError={saveErrorMessage}
        deleteError={deleteErrorMessage}
        groupPending={admin.groupPending}
        onClose={close}
        onCloseDelete={() => setDeleting(null)}
        onSubmitProduct={(payload) =>
          writes.saveProduct(toSavePayload(payload, editing?.id), editing?.id, close)
        }
        onSubmitSet={(values) => writes.saveSet(toSetSavePayload(values), close)}
        onAssign={(choice) => {
          const productIds = [...selectedIds];
          if (choice.newName) {
            admin.assignToNew.mutate({
              name: choice.newName,
              productIds,
              ownerOrgId: manufacturerId,
            });
          } else if (choice.groupId) {
            admin.assignGroup.mutate({
              groupId: choice.groupId,
              productIds,
              ownerOrgId: manufacturerId,
            });
          }
          close();
        }}
        onCreateGroup={(name) => admin.saveGroup.mutate({ name, ownerOrgId: manufacturerId })}
        onRenameGroup={(id, name) =>
          admin.saveGroup.mutate({ id, name, ownerOrgId: manufacturerId })
        }
        onDeleteGroup={(id) => admin.deleteGroup.mutate({ id, ownerOrgId: manufacturerId })}
        onSetMembers={(groupId, productIds) =>
          admin.setMembers.mutate({ groupId, productIds, ownerOrgId: manufacturerId })
        }
        onConfirmDelete={() => deleting && writes.deleteProduct(deleting.id, () => setDeleting(null))}
      />
    </div>
  );
}
