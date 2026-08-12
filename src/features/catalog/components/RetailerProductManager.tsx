import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useProducts, type CatalogProduct } from '../api/useProducts';
import { useProductStock } from '../api/useProductStock';
import { useProductGroups } from '../api/useProductGroups';
import { useRetailPrices, useSaveRetailPrice } from '../api/useRetailPrices';
import { useCatalogAdmin } from '../api/useCatalogAdmin';
import {
  collectCategories,
  filterProducts,
  type ActivityFilter,
  type StockFilter,
} from '../domain/productStats';
import { ProductFilterBar } from './ProductFilterBar';
import { ProductDialogs, type ProductDialogKind } from './ProductDialogs';
import { RetailerProductTable } from './RetailerProductTable';
import type { ProductSubmit } from './ProductDialog';
import type { SetSubmit } from './SetBuilderDialog';
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

  const admin = useCatalogAdmin();
  const saveRetailPrice = useSaveRetailPrice();

  // Sadece Guest üretici ise kalıcı silme vs yapılabilir.
  const canDelete = isGuest && canEditCatalog;

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

  const handleUpdateRetailPrice = async (productId: string, price: number) => {
    await saveRetailPrice.mutateAsync({ productId, retailPrice: price });
  };

  const handleSubmitProduct = async (payload: ProductSubmit) => {
    const saveInput = toSavePayload(payload, editing?.id);
    const retailPriceVal = saveInput.costPrice;

    try {
      const createdId = await admin.saveProduct.mutateAsync({
        ...saveInput,
        costPrice: undefined,
        ownerOrgId: manufacturerId,
      });

      const pId = editing?.id ?? (typeof createdId === 'string' ? createdId : undefined);
      if (retailPriceVal !== undefined && pId) {
        await saveRetailPrice.mutateAsync({
          productId: pId,
          retailPrice: retailPriceVal,
        });
      }
      close();
    } catch {
      // Hata admin.saveProduct.error üzerinden otomatik gösterilir
    }
  };

  const handleSubmitSet = (values: SetSubmit) => {
    const saveInput = toSetSavePayload(values);
    admin.saveProduct.mutate(
      { ...saveInput, ownerOrgId: manufacturerId },
      { onSuccess: close },
    );
  };

  const handleConfirmDelete = () => {
    if (deleting) {
      admin.deleteProduct.mutate(
        { id: deleting.id, ownerOrgId: manufacturerId },
        { onSuccess: () => setDeleting(null) },
      );
    }
  };

  const saveErrorMessage =
    admin.saveProduct.error instanceof Error ? admin.saveProduct.error.message : null;
  const deleteErrorMessage =
    admin.deleteProduct.error instanceof Error ? admin.deleteProduct.error.message : null;

  return (
    <div className="space-y-6">
      {isGuest && canEditCatalog && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 shadow-inner">
            <button
              type="button"
              onClick={() => setActivity('active')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activity === 'active'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Aktif ürünler
            </button>
            <button
              type="button"
              onClick={() => setActivity('inactive')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activity === 'inactive'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pasif ürünler
            </button>
          </div>
          <Button variant="secondary" onClick={() => setDialog('group-manage')}>
            Gruplar
          </Button>
          <Button variant="secondary" onClick={() => setDialog('set')}>
            Set Oluştur
          </Button>
          <Button variant="primary" onClick={() => { setEditing(undefined); setDialog('product'); }}>
            Yeni Ürün
          </Button>
        </div>
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
        canEdit={isGuest && canEditCatalog}
        selectedIds={selectedIds}
        onToggleOne={(id) => {
          const next = new Set(selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedIds(next);
        }}
        onToggleAll={(pageIds, selectAll) => {
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
        onToggleActive={(p) => admin.setActive.mutate({ id: p.id, isActive: !p.isActive, ownerOrgId: manufacturerId })}
        onDelete={(p) => setDeleting(p)}
        onUpdateRetailPrice={handleUpdateRetailPrice}
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
        onSubmitProduct={handleSubmitProduct}
        onSubmitSet={handleSubmitSet}
        onAssign={(choice) => {
          const productIds = selectedIds ? [...selectedIds] : [];
          if (choice.newName) {
            admin.assignToNew.mutate({ name: choice.newName, productIds, ownerOrgId: manufacturerId });
          } else if (choice.groupId) {
            admin.assignGroup.mutate({ groupId: choice.groupId, productIds, ownerOrgId: manufacturerId });
          }
          close();
        }}
        onCreateGroup={(name) => admin.saveGroup.mutate({ name, ownerOrgId: manufacturerId })}
        onRenameGroup={(id, name) => admin.saveGroup.mutate({ id, name, ownerOrgId: manufacturerId })}
        onDeleteGroup={(id) => admin.deleteGroup.mutate({ id, ownerOrgId: manufacturerId })}
        onSetMembers={(groupId, productIds) => admin.setMembers.mutate({ groupId, productIds, ownerOrgId: manufacturerId })}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
