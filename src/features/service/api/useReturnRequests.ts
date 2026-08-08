import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import { filterOps, type ServiceFilters } from '../domain/filters';
import {
  RETURN_COLUMNS,
  counterpartyName,
  keyset,
  nested,
  next,
  nullableStr,
  str,
  type Cursor,
  type ReturnStatus,
  type Row,
} from './shared';

export interface ReturnRequest extends Cursor {
  id: string;
  status: ReturnStatus;
  reason: string | null;
  /** Onay anında SİPARİŞTEN hesaplanan tutar; talep sahibi belirleyemez. */
  approvedAmount: number | null;
  createdAt: string;
  orderNo: string;
  counterpartyName: string;
  manufacturerOrgId: string;
}

function toReturn(raw: unknown, myOrgId: string): ReturnRequest {
  const r = raw as Row;
  return {
    id: str(r.id),
    status: r.status as ReturnStatus,
    reason: nullableStr(r.reason),
    approvedAmount: r.approved_amount == null ? null : Number(r.approved_amount),
    createdAt: str(r.created_at),
    orderNo: str(nested(r.orders).order_no),
    counterpartyName: counterpartyName(r, myOrgId),
    manufacturerOrgId: str(r.manufacturer_org_id),
  };
}

/** İade talepleri — keyset sayfalama (A17), filtreler sorgu anahtarında. */
export function useReturnRequests(myOrgId: string, myKind: string, filters: ServiceFilters) {
  return useInfiniteQuery({
    queryKey: ['service', 'returns', myOrgId, filters],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as Cursor | undefined,
    queryFn: async ({ pageParam }) => {
      const ops = filterOps(filters, myKind);

      let q = supabase
        .from('return_requests')
        .select(RETURN_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      for (const [column, value] of ops.equals) q = q.eq(column, value);
      if (ops.gte) q = q.gte('created_at', ops.gte);
      if (ops.lt) q = q.lt('created_at', ops.lt);
      if (pageParam) q = q.or(keyset(pageParam));

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((raw) => toReturn(raw, myOrgId));
    },
    getNextPageParam: (last) => next(last, PAGE_SIZE),
  });
}
