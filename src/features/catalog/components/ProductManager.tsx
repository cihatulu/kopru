import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useProducts, useProductCosts, type CatalogProduct } from '../api/useProducts';
import { useProductStock } from '../api/useProductStock';
import { useProductGroups } from '../api/useProductGroups';
import { useCatalogAdmin } from '../api/useCatalogAdmin';
import { computeStats, matchesStockFilter, type StockFilter } from '../domain/productStats';
import { toSavePayload } from '../domain/submitMapping';
import { ProductStatCards } from './ProductStatCards';
import { ProductHeaderActions } from './ProductHeaderActions';
import { ProductFilterBar } from './ProductFilterBar';
import { ProductTable } from './ProductTable';
import { ProductDialogs, type ProductDialogKind } from './ProductDialogs';

/** Ürün Yönetimi — durum burada, sayfa yalnız kompozisyon (A19/A20). */
export function ProductManager({ orgId }: { orgId: string }) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
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

  const visible = all.filter((p) => {
    if (!matchesStockFilter(stock.data?.[p.id] ?? null, stockFilter)) return false;
    if (groupFilter === '') return true;
    if (groupFilter === 'yok') return p.groupId === null;
    return p.groupId === groupFilter;
  });

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
      <div className="flex flex-col items-start justify-between gap-5 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Ürün Yönetimi</h1>
          <p className="mt-1 text-xs text-slate-500">
            Katalog ürünlerini, set takımlarını ve ürün gruplarını yönetin.
          </p>
        </div>

        <ProductHeaderActions
          selectedCount={selectedIds.size}
          selectedSingleCount={selected.filter((p) => p.type === 'single').length}
          productCount={all.length}
          setCount={all.filter((p) => p.type === 'set').length}
          groups={groups.data ?? []}
          onAssignGroup={() => setDialog('group-assign')}
          onManageGroups={() => setDialog('group-manage')}
          onCreateSet={() => setDialog('set')}
          onAddProduct={() => {
            setEditing(undefined);
            setDialog('product');
          }}
        />
      </div>

      <ProductStatCards stats={stats} />

      <ProductFilterBar
        search={search}
        groupFilter={groupFilter}
        stockFilter={stockFilter}
        groups={groups.data ?? []}
        onSearch={setSearch}
        onGroupFilter={setGroupFilter}
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
          selectedIds={selectedIds}
          onToggleOne={(id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onToggleAll={(rowIds, selectAll) =>
            setSelectedIds(selectAll ? new Set(rowIds) : new Set())
          }
          onEdit={(p) => {
            setEditing(p);
            setDialog('product');
          }}
          onDelete={setDeleting}
        />
      )}

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Toplam {visible.length} ürün listeleniyor
        </span>
        {list.hasNextPage && (
          <Button
            variant="secondary"
            loading={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            Daha fazla yükle
          </Button>
        )}
      </div>

      <ProductDialogs
        kind={dialog}
        orgId={orgId}
        groups={groups.data ?? []}
        allProducts={all}
        selected={selected}
        costs={costs.data}
        stock={stock.data}
        editing={editing}
        deleting={deleting}
        savePending={admin.saveProduct.isPending}
        saveFailed={admin.saveProduct.isError}
        groupPending={admin.groupPending}
        deletePending={admin.setActive.isPending}
        onClose={close}
        onCloseDelete={() => setDeleting(null)}
        onSubmitProduct={(payload) =>
          admin.saveProduct.mutate(toSavePayload(payload, editing?.id), { onSuccess: close })
        }
        onSubmitSet={(v) =>
          admin.saveProduct.mutate(
            {
              name: v.name,
              code: v.code,
              supplierPrice: v.price,
              ...(v.cost !== undefined ? { costPrice: v.cost } : {}),
              description: v.description,
              type: 'set',
              setContents: v.contents,
              stock: v.stock,
            },
            {
              onSuccess: () => {
                setSelectedIds(new Set());
                close();
              },
            },
          )
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
        onDeleteGroup={(id) => admin.deleteGroup.mutate(id)}
        onSetMembers={(groupId, productIds) => admin.setMembers.mutate({ groupId, productIds })}
        onConfirmDelete={() =>
          deleting &&
          admin.setActive.mutate(
            { id: deleting.id, isActive: false },
            { onSuccess: () => setDeleting(null) },
          )
        }
      />
    </div>
  );
}
