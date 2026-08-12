import { useCatalogAdmin } from './useCatalogAdmin';
import { useSaveRetailPrice } from './useRetailPrices';
import type { SaveProductInput } from './useProductMutations';

/**
 * Perakendecinin, misafir üreticisi adına yaptığı katalog yazmaları.
 *
 * Kritik ayrım (A4): perakendeci formundaki "maliyet" alanı üreticinin
 * maliyeti DEĞİL, perakendecinin kendi satış fiyatıdır. Bu yüzden ürün
 * kaydından ayrılıp `retail_prices` tablosuna yazılır — `products` tablosuna
 * gizli fiyat sızmaz.
 */
export function useRetailerCatalogWrites(manufacturerId: string) {
  const admin = useCatalogAdmin();
  const saveRetailPrice = useSaveRetailPrice();

  const saveProduct = async (
    input: SaveProductInput,
    editingId: string | undefined,
    onDone: () => void,
  ) => {
    const retailPrice = input.costPrice;
    try {
      const createdId = await admin.saveProduct.mutateAsync({
        ...input,
        costPrice: undefined,
        ownerOrgId: manufacturerId,
      });

      const productId = editingId ?? (typeof createdId === 'string' ? createdId : undefined);
      if (retailPrice !== undefined && productId) {
        await saveRetailPrice.mutateAsync({ productId, retailPrice });
      }
      onDone();
    } catch {
      // Hata admin.saveProduct.error üzerinden gösteriliyor.
    }
  };

  return {
    admin,
    saveRetailPrice,
    /** Formu kaydeder; söz döndürmez, JSX'e doğrudan bağlanabilir. */
    saveProduct: (input: SaveProductInput, editingId: string | undefined, onDone: () => void) =>
      void saveProduct(input, editingId, onDone),
    updateRetailPrice: (productId: string, retailPrice: number) =>
      void saveRetailPrice.mutateAsync({ productId, retailPrice }),
    saveSet: (input: SaveProductInput, onDone: () => void) =>
      admin.saveProduct.mutate({ ...input, ownerOrgId: manufacturerId }, { onSuccess: onDone }),
    deleteProduct: (id: string, onDone: () => void) =>
      admin.deleteProduct.mutate({ id, ownerOrgId: manufacturerId }, { onSuccess: onDone }),
  };
}
