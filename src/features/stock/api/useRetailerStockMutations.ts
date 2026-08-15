import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import type { StockCsvRow } from '../domain/csv';
import type { BulkStockResult } from './useStockMutations';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['stock'] });
    // Katalogdaki "BENDE: n" rozeti de bu veriyi gösteriyor; bayat kalmasın.
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    // Toplu yükleme yeni PASİF ürün doğurmuş olabilir.
    void queryClient.invalidateQueries({ queryKey: ['products'] });
  };
}

/**
 * Perakendecinin kendi deposundaki adedi düzeltir.
 *
 * İstemci `retailer_stock` tablosuna ASLA doğrudan yazmaz (kilitli kural 14) —
 * o tabloda INSERT/UPDATE politikası yoktur. Sunucu ürünün gerçekten bir
 * tedarikçisine ait olduğunu doğrular.
 */
export function useSetRetailerStock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const { error } = await supabase.rpc('set_retailer_stock', rpcArgs({
        p_product_id: productId,
        p_quantity: quantity,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export interface BulkRetailerStockInput {
  rows: StockCsvRow[];
  /**
   * Kimliksiz satırlardan doğacak ürünlerin sahibi. Yalnız yeni ürün varsa
   * gerekir; kimliği olan satırlar kendi üreticisine gider.
   */
  manufacturerOrgId: string | null;
}

/**
 * Excel ile toplu güncelleme.
 *
 * Sunucu tek transaction'da işler; yarım güncelleme olmaz. Tedarikçisi olmayan
 * üreticinin ürün kimlikleri sessizce atlanır. Kimliksiz satırlar seçilen
 * üreticinin kataloğuna PASİF ürün olarak doğar — yeni bir tedarikçinin tüm
 * listesini tek dosyada açmanın yolu budur.
 */
export function useBulkUpdateRetailerStock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      rows,
      manufacturerOrgId,
    }: BulkRetailerStockInput): Promise<BulkStockResult> => {
      const payload = rows.map((r) => ({
        product_id: r.productId,
        quantity: r.quantity,
        name: r.productName,
        code: r.productCode,
        category: r.category,
      }));
      const { data, error } = await supabase.rpc(
        'bulk_update_retailer_stock',
        rpcArgs({
          p_rows: payload,
          ...(manufacturerOrgId ? { p_manufacturer_org_id: manufacturerOrgId } : {}),
        }),
      );
      if (error) throw error;
      const raw = data as { updated?: number; created?: number } | null;
      return { updated: Number(raw?.updated ?? 0), created: Number(raw?.created ?? 0) };
    },
    onSuccess: invalidate,
  });
}
