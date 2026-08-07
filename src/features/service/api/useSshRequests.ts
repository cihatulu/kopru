import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
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

/** SSH talepleri — keyset sayfalama (A17). RLS kapsamı daraltır (A16). */
export function useSshRequests(myOrgId: string) {
  return useInfiniteQuery({
    queryKey: ['service', 'ssh', myOrgId],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as Cursor | undefined,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('ssh_requests')
        .select(SSH_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);
      if (pageParam) q = q.or(keyset(pageParam));

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((raw) => toSsh(raw, myOrgId));
    },
    getNextPageParam: (last) => next(last, PAGE_SIZE),
  });
}
