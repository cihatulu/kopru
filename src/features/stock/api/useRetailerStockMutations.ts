import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import type { StockCsvRow } from '../domain/csv';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['stock'] });
    // Katalogdaki "BENDE: n" rozeti de bu veriyi gösteriyor; bayat kalmasın.
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
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

/**
 * CSV ile toplu güncelleme.
 *
 * Sunucu tek transaction'da işler; yarım güncelleme olmaz. Tedarikçisi olmayan
 * üreticinin ürün kimlikleri sessizce atlanır — dönen sayı GERÇEKTEN yazılan
 * satır sayısıdır ve kullanıcıya o gösterilir.
 */
export function useBulkUpdateRetailerStock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (rows: StockCsvRow[]): Promise<number> => {
      const payload = rows.map((r) => ({ product_id: r.productId, quantity: r.quantity }));
      const { data, error } = await supabase.rpc(
        'bulk_update_retailer_stock',
        rpcArgs({ p_rows: payload }),
      );
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: invalidate,
  });
}
