import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

/**
 * Ürünlerin stok adetleri. Ayrı sorgu çünkü stok ayrı tabloda tutulur
 * (sipariş anında atomik olarak düşer) ve katalog listesi her zaman
 * stok bilgisine ihtiyaç duymaz.
 */
export function useProductStock(productIds: string[]) {
  return useQuery({
    queryKey: ['catalog', 'stock', [...productIds].sort()],
    enabled: productIds.length > 0,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('manufacturer_stock')
        .select('product_id, quantity')
        .in('product_id', productIds);
      if (error) throw error;

      const map: Record<string, number> = {};
      for (const row of data ?? []) map[row.product_id] = Number(row.quantity);
      return map;
    },
  });
}
