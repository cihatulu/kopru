import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

/**
 * Misafir üreticiyi sisteme ekleyen perakendeciyi bulur.
 *
 * `organizations.created_by_org_id` veya oturumdaki sponsor bilgisi boşsa
 * son çare budur. İlişki satırı iki tarafı da denormalize taşır (kural 9),
 * bu yüzden tek eşitlikle okunur.
 */
export function useSponsorRetailerId(manufacturerOrgId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['catalog', 'sponsor-retailer', manufacturerOrgId],
    enabled: enabled && Boolean(manufacturerOrgId),
    staleTime: STALE_TIME.catalog,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relationships')
        .select('retailer_org_id')
        .eq('manufacturer_org_id', manufacturerOrgId ?? '')
        .eq('status', 'active')
        // Birden fazla perakendeci olabilir; ilk kuran sponsor sayılır.
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.retailer_org_id ?? null;
    },
  });
}
