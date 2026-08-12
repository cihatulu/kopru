import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import type { OrderStatus } from '../domain/status';

export interface OrderStats {
  all: number;
  pending: number;
  in_production: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

/** Sayaçlar RLS kapsamında sayılır; ayrıca org filtresi gerekmez (A9). */
export function useOrderStats(myOrgId: string) {
  return useQuery({
    queryKey: ['orders', 'stats', myOrgId],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<OrderStats> => {
      const count = (status?: OrderStatus[] | OrderStatus) => {
        const q = supabase.from('orders').select('id', { count: 'exact', head: true });
        if (Array.isArray(status)) return q.in('status', status);
        if (status) return q.eq('status', status);
        return q;
      };

      const [all, pending, production, shipped, delivered, cancelled] = await Promise.all([
        count(),
        count('pending'),
        // "Üretiliyor" kutusu onay ve kısmi sevkiyatı da kapsar.
        count(['confirmed', 'in_production', 'partially_shipped']),
        count('shipped'),
        count('delivered'),
        count('cancelled'),
      ]);

      return {
        all: all.count ?? 0,
        pending: pending.count ?? 0,
        in_production: production.count ?? 0,
        shipped: shipped.count ?? 0,
        delivered: delivered.count ?? 0,
        cancelled: cancelled.count ?? 0,
      };
    },
  });
}
