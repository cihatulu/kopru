import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME, ORG_KIND } from '@/constants';
import { useAuthSession } from '@/features/auth';
import type { OrderStatus } from '../domain/status';

export interface OrderStats {
  all: number;
  pending: number;
  in_production: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export function useOrderStats(myOrgId: string) {
  const { data: session } = useAuthSession();
  const org = session?.org;
  const isSubscriber = org?.isSubscriber ?? true;
  const activeSponsorId = session?.sponsorOrgId || org?.createdByOrgId;
  const kind = org?.kind;

  return useQuery({
    queryKey: ['orders', 'stats', myOrgId, isSubscriber, activeSponsorId],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<OrderStats> => {
      const count = (status?: OrderStatus[] | OrderStatus) => {
        let q = supabase.from('orders').select('id', { count: 'exact', head: true });

        if (!isSubscriber && activeSponsorId) {
          if (kind === ORG_KIND.manufacturer) {
            q = q.eq('manufacturer_org_id', myOrgId).eq('retailer_org_id', activeSponsorId);
          } else {
            q = q.eq('retailer_org_id', myOrgId).eq('manufacturer_org_id', activeSponsorId);
          }
        } else if (myOrgId) {
          q = q.or(`manufacturer_org_id.eq.${myOrgId},retailer_org_id.eq.${myOrgId}`);
        }

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
    enabled: !!myOrgId,
  });
}
