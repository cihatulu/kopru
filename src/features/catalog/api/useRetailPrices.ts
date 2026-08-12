import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

export interface RetailPrice {
  productId: string;
  retailPrice: number;
}

export function useRetailPrices(productIds: string[]) {
  return useQuery({
    queryKey: ['catalog', 'retail-prices', productIds.sort().join(',')],
    enabled: productIds.length > 0,
    staleTime: STALE_TIME.catalog,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('retail_prices')
        .select('product_id, retail_price')
        .in('product_id', productIds);
      if (error) throw error;
      const dict: Record<string, number> = {};
      for (const r of data ?? []) {
        dict[r.product_id] = Number(r.retail_price);
      }
      return dict;
    },
  });
}

export function useSaveRetailPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, retailPrice }: RetailPrice) => {
      const { error } = await supabase
        .from('retail_prices')
        .upsert(
          {
            retailer_org_id: (await supabase.auth.getUser()).data.user?.user_metadata?.org_id,
            product_id: productId,
            retail_price: retailPrice,
          },
          { onConflict: 'retailer_org_id,product_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'retail-prices'] });
    },
  });
}
