import {
  useDeleteProductGroup,
  useSaveProductGroup,
} from './useProductGroups';
import {
  useAssignProductsToGroup,
  useAssignToNewGroup,
  useSetGroupProducts,
} from './useGroupMembership';
import {
  useDeleteProductPermanently,
  useSaveProduct,
  useSaveProductCost,
  useSetProductActive,
} from './useProductMutations';

/**
 * Ürün Yönetimi ekranının yazma işlemleri — tek yerde toplanmış.
 *
 * Yedi ayrı mutasyonu bileşende tek tek kurmak, o bileşeni yalnız hook
 * bildirimleriyle 20 satır şişiriyordu (A19). Burada toplanınca bileşen
 * "ne yapılabilir"i tek nesneden okuyor.
 */
export function useCatalogAdmin() {
  const saveProduct = useSaveProduct();
  const saveCost = useSaveProductCost();
  const setActive = useSetProductActive();
  const deleteProduct = useDeleteProductPermanently();
  const saveGroup = useSaveProductGroup();
  const deleteGroup = useDeleteProductGroup();
  const assignGroup = useAssignProductsToGroup();
  const assignToNew = useAssignToNewGroup();
  const setMembers = useSetGroupProducts();

  return {
    saveProduct,
    saveCost,
    setActive,
    deleteProduct,
    saveGroup,
    deleteGroup,
    assignGroup,
    assignToNew,
    setMembers,
    /** Grup işlemlerinden HERHANGİ biri sürüyor mu — diyaloglar buna bakar. */
    groupPending:
      saveGroup.isPending ||
      deleteGroup.isPending ||
      assignGroup.isPending ||
      assignToNew.isPending ||
      setMembers.isPending,
  };
}
