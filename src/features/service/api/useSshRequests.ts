import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import { filterOps, type ServiceFilters } from '../domain/filters';
import {
  SSH_COLUMNS,
  counterpartyName,
  keyset,
  next,
  nullableStr,
  str,
  type Cursor,
  type Row,
  type SshStatus,
} from './shared';

export interface SshRequest extends Cursor {
  id: string;
  title: string;
  description: string | null;
  status: SshStatus;
  createdAt: string;
  customerName: string | null;
  counterpartyName: string;
  manufacturerOrgId: string;
}

function toSsh(raw: unknown, myOrgId: string): SshRequest {
  const r = raw as Row;
  return {
    id: str(r.id),
    title: str(r.title),
    description: nullableStr(r.description),
    status: r.status as SshStatus,
    createdAt: str(r.created_at),
    customerName: nullableStr(r.customer_name),
    counterpartyName: counterpartyName(r, myOrgId),
    manufacturerOrgId: str(r.manufacturer_org_id),
  };
}

/**
 * SSH talepleri — keyset sayfalama (A17). RLS kapsamı daraltır (A16).
 *
 * Filtreler sorgu ANAHTARININ parçasıdır: değiştiğinde react-query yeni bir
 * önbellek girdisi açar ve sayfalama baştan başlar. Aynı anahtarda kalsalardı
 * eski imleç yeni filtreyle karışır, liste rastgele bir yerinden devam ederdi.
 */
export function useSshRequests(myOrgId: string, myKind: string, filters: ServiceFilters) {
  return useInfiniteQuery({
    queryKey: ['service', 'ssh', myOrgId, filters],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as Cursor | undefined,
    queryFn: async ({ pageParam }) => {
      const ops = filterOps(filters, myKind);

      let q = supabase
        .from('ssh_requests')
        .select(SSH_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      for (const [column, value] of ops.equals) q = q.eq(column, value);
      if (ops.gte) q = q.gte('created_at', ops.gte);
      if (ops.lt) q = q.lt('created_at', ops.lt);
      if (pageParam) q = q.or(keyset(pageParam));

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((raw) => toSsh(raw, myOrgId));
    },
    getNextPageParam: (last) => next(last, PAGE_SIZE),
  });
}
