import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import { filterOps, type ServiceFilters } from '../domain/filters';
import { sshCode } from '../domain/sshCode';
import {
  SSH_COLUMNS,
  counterpartyName,
  keyset,
  nested,
  next,
  nullableStr,
  str,
  type Cursor,
  type Row,
  type SshStatus,
} from './shared';

export interface SshProductItem {
  name: string;
  quantity: number;
}

export interface SshRequest extends Cursor {
  id: string;
  sshCode: string;
  title: string;
  description: string | null;
  status: SshStatus;
  createdAt: string;
  orderNo: string;
  customerName: string | null;
  customerPhone: string | null;
  counterpartyName: string;
  manufacturerOrgId: string;
  retailerOrgId: string;
  relationshipId: string;
  items: SshProductItem[];
}

function toSsh(raw: unknown, myOrgId: string): SshRequest {
  try {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Row;
    const id = str(r.id);
    const createdAt = str(r.created_at);
    const code = sshCode(id, createdAt);

    // Gömülü ilişki PostgREST'ten tek nesne ya da dizi olarak gelebilir.
    const orderObj = Array.isArray(r.orders) ? nested(r.orders[0]) : nested(r.orders);
    const orderNo = str(orderObj.order_no) || '—';

    const items: SshProductItem[] = [];
    if (r.title) {
      items.push({ name: str(r.title), quantity: 1 });
    }

    return {
      id,
      sshCode: code,
      title: str(r.title),
      description: nullableStr(r.description),
      status: (r.status as SshStatus) || 'bekliyor',
      createdAt,
      orderNo,
      customerName: nullableStr(r.customer_name),
      customerPhone: nullableStr(r.customer_phone),
      counterpartyName: counterpartyName(r, myOrgId),
      manufacturerOrgId: str(r.manufacturer_org_id),
      retailerOrgId: str(r.retailer_org_id),
      relationshipId: str(r.relationship_id),
      items,
    };
  } catch (err) {
    console.error('[toSsh] parse error:', err, raw);
    return {
      id: str(nested(raw).id),
      sshCode: 'SSH-ERR',
      title: 'Talep',
      description: null,
      status: 'bekliyor',
      createdAt: new Date().toISOString(),
      orderNo: '—',
      customerName: null,
      customerPhone: null,
      counterpartyName: '—',
      manufacturerOrgId: '',
      retailerOrgId: '',
      relationshipId: '',
      items: [],
    };
  }
}

/**
 * SSH talepleri — keyset sayfalama (A17). RLS kapsamı daraltır (A16).
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
      if (error) {
        console.error('[useSshRequests] fetch error:', error);
        throw error;
      }
      return (data ?? []).map((raw) => toSsh(raw, myOrgId));
    },
    getNextPageParam: (last) => next(last, PAGE_SIZE),
  });
}
