import type { ProductGroup } from '../api/useProductGroups';
import type { CatalogProduct } from '../api/useProducts';
import { ProductDialog, type ProductSubmit } from './ProductDialog';
import { GroupAssignDialog } from './GroupAssignDialog';
import { GroupManagerDialog } from './GroupManagerDialog';
import { SetBuilderDialog, type SetSubmit } from './SetBuilderDialog';
import { DeleteProductDialog } from './DeleteProductDialog';

export type ProductDialogKind = 'none' | 'product' | 'group-assign' | 'group-manage' | 'set';

interface Props {
  kind: ProductDialogKind;
  orgId: string;
  groups: ProductGroup[];
  allProducts: CatalogProduct[];
  /** Daha önce kullanılmış kategoriler — ürün formundaki öneri listesi. */
  categories: string[];
  selected: CatalogProduct[];
  costs: Record<string, number> | undefined;
  stock: Record<string, number> | undefined;
  editing: CatalogProduct | undefined;
  deleting: CatalogProduct | null;

  savePending: boolean;
  saveFailed: boolean;
  groupPending: boolean;
  deletePending: boolean;

  onClose: () => void;
  onCloseDelete: () => void;
  onSubmitProduct: (payload: ProductSubmit) => void;
  onSubmitSet: (values: SetSubmit) => void;
  onAssign: (choice: { newName?: string; groupId?: string }) => void;
  onCreateGroup: (name: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  onSetMembers: (groupId: string, productIds: string[]) => void;
  onConfirmDelete: () => void;
}

/**
 * Ürün Yönetimi ekranının beş diyaloğu.
 *
 * Durum kapsayıcıda, seçim mantığı burada — sayfayı ve kapsayıcıyı bütçede
 * tutmak için ayrıldı (A19/A20), aynı desen admin ekranında da kullanılıyor.
 */
export function ProductDialogs(props: Props) {
  const { kind, groups, allProducts, categories, selected, costs, stock, editing, deleting } = props;

  return (
    <>
      {kind === 'product' && (
        <ProductDialog
          product={editing}
          initialCost={editing ? costs?.[editing.id] : undefined}
          initialStock={editing ? stock?.[editing.id] : undefined}
          orgId={props.orgId}
          groups={groups}
          allProducts={allProducts}
          categories={categories}
          pending={props.savePending}
          errorMessage={props.saveFailed ? 'Kaydedilemedi. Bilgileri kontrol edin.' : undefined}
          onClose={props.onClose}
          onSubmit={props.onSubmitProduct}
        />
      )}

      {kind === 'group-assign' && (
        <GroupAssignDialog
          groups={groups}
          selectedCount={selected.length}
          pending={props.groupPending}
          onClose={props.onClose}
          onSave={props.onAssign}
        />
      )}

      {kind === 'group-manage' && (
        <GroupManagerDialog
          groups={groups}
          products={allProducts}
          pending={props.groupPending}
          onClose={props.onClose}
          onCreate={props.onCreateGroup}
          onRename={props.onRenameGroup}
          onDelete={props.onDeleteGroup}
          onSetMembers={props.onSetMembers}
        />
      )}

      {kind === 'set' && (
        <SetBuilderDialog
          // Setin içine set konulamaz — sonsuz döngü demektir.
          selected={selected.filter((p) => p.type === 'single')}
          costs={costs}
          pending={props.savePending}
          errorMessage={props.saveFailed ? 'Takım oluşturulamadı.' : undefined}
          onClose={props.onClose}
          onSubmit={props.onSubmitSet}
        />
      )}

      {deleting && (
        <DeleteProductDialog
          product={deleting}
          pending={props.deletePending}
          onClose={props.onCloseDelete}
          onConfirm={props.onConfirmDelete}
        />
      )}
    </>
  );
}
