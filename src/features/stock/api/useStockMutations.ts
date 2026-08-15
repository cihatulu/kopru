import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import type { StockCsvRow } from '../domain/csv';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['stock'] });
    // Katalog listesi de stok gösteriyor; bayat kalmasın.
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    // Toplu yükleme yeni PASİF ürün doğurmuş olabilir.
    void queryClient.invalidateQueries({ queryKey: ['products'] });
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
      const { error } = await supabase.rpc('set_product_stock', rpcArgs({
        p_product_id: productId,
        p_quantity: quantity,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Sunucunun gerçekten yaptığı iş — gönderilen satır sayısı değil. */
export interface BulkStockResult {
  updated: number;
  /** Kimliksiz satırlardan doğan PASİF ürünler. */
  created: number;
}

/**
 * CSV ile toplu güncelleme.
 *
 * Sunucu tek transaction'da işler; yarım güncelleme olmaz. Kimliği olmayan ama
 * adı olan satırdan PASİF ürün doğar; kimliği dolu ama bize ait olmayan satır
 * atlanır ve ürün doğurmaz.
 */
export function useBulkUpdateStock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (rows: StockCsvRow[]): Promise<BulkStockResult> => {
      const payload = rows.map((r) => ({
        product_id: r.productId,
        quantity: r.quantity,
        name: r.productName,
        code: r.productCode,
        category: r.category,
      }));
      const { data, error } = await supabase.rpc('bulk_update_stock', rpcArgs({ p_rows: payload }));
      if (error) throw error;
      // NOT: `database.generated.ts` bu RPC için hâlâ `Returns: number` diyor;
      // migration uygulanıp `npm run gen:types` çalıştırılınca jsonb olacak
      // (kilitli kural 13). Çift dönüşüm o güne kadar geçici.
      const raw = data as unknown as { updated?: number; created?: number } | null;
      return { updated: Number(raw?.updated ?? 0), created: Number(raw?.created ?? 0) };
    },
    onSuccess: invalidate,
  });
}
