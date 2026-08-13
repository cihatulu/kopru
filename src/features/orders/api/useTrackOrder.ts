import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import type { TrackedOrder } from '../domain/tracking';

/**
 * Public sipariş takibi.
 *
 * Kimlik doğrulaması YOK — jetonu bilen görür. RPC `anon` rolüne açıktır ve
 * bilinçli olarak sınırlı veri döndürür: üretici fiyatı, iç notlar ve cari
 * bilgisi dönmez (A4).
 */
export function useTrackOrder(token: string | undefined) {
  return useQuery({
    queryKey: ['track-order', token],
    enabled: Boolean(token),
    staleTime: STALE_TIME.transactional,
    retry: false,
    queryFn: async (): Promise<TrackedOrder | null> => {
      const { data, error } = await supabase.rpc('track_order', { p_token: token ?? '' });
      if (error) throw error;

      const rows = (data ?? []) as unknown as TrackedOrder[];
      return rows[0] ?? null;
    },
  });
}
