import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { StockCsvRow } from '../domain/csv';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['stock'] });
    // Katalog listesi de stok gösteriyor; bayat kalmasın.
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
  };
}

/**
 * Tek ürünün stoğunu düzeltir.
 *
 * İstemci `manufacturer_stock` tablosuna ASLA doğrudan yazmaz (kilitli kural
 * 14) — o tabloda INSERT/UPDATE politikası yoktur. Sipariş dışı düzeltmenin
 * meşru yolu bu RPC'dir.
 */
export function useSetProductStock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const { error } = await supabase.rpc('set_product_stock', {
        p_product_id: productId,
        p_quantity: quantity,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * CSV ile toplu güncelleme.
 *
 * Sunucu tek transaction'da işler; yarım güncelleme olmaz. Yabancı ürün
 * kimlikleri sessizce atlanır — dönen sayı GERÇEKTEN işlenen satır sayısıdır
 * ve kullanıcıya o gösterilir, "gönderdiğim satır sayısı" değil.
 */
export function useBulkUpdateStock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (rows: StockCsvRow[]): Promise<number> => {
      const payload = rows.map((r) => ({ product_id: r.productId, quantity: r.quantity }));
      const { data, error } = await supabase.rpc('bulk_update_stock', { p_rows: payload });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: invalidate,
  });
}
