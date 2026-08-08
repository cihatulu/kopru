import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

/**
 * Perakendecinin KENDİ deposundaki adetler.
 *
 * `useProductStock` tedarikçinin (üreticinin) stoğunu okur; bu ise
 * perakendecinin kendi stoğunu. İkisi ayrı tablodur ve karıştırılmamalıdır:
 * "tedarikçide 17 var" ile "bende 3 var" farklı kararlara yol açar.
 *
 * `enabled` ile kapatılabilir — misafir perakendecinin kendi stok kaydı
 * olmadığı için sorgu hiç çalıştırılmaz.
 */
export function useRetailerStock(productIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['catalog', 'retailer-stock', [...productIds].sort()],
    enabled: enabled && productIds.length > 0,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('retailer_stock')
        .select('product_id, quantity')
        .in('product_id', productIds);
      if (error) throw error;

      const map: Record<string, number> = {};
      for (const row of data ?? []) map[row.product_id] = Number(row.quantity);
      return map;
    },
  });
}
