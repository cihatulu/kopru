import { useQueryClient } from '@tanstack/react-query';

/**
 * Ürün mutasyonundan sonra bayatlayan sorgular.
 *
 * `stock` da listede: `save_product` başlangıç adedini yazar, kalıcı silme ise
 * stok satırını birlikte götürür. Yalnız `catalog` geçersizlenseydi Stok
 * Yönetimi silinmiş ürünü göstermeye devam ederdi.
 */
export function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ['catalog', 'stock']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}
