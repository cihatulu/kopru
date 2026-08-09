import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME, type Plan, type RelationshipStatus } from '@/constants';
import { keysetFilter, nextCursor, type Cursor } from '../domain/keyset';
import { RELATIONSHIP_LIST_COLUMNS, SUBSCRIPTION_REQUEST_COLUMNS } from './columns';

export interface RelationshipParty {
  id: string;
  companyName: string;
  vknTc: string;
  isSubscriber: boolean;
}

export interface AdminRelationship extends Cursor {
  id: string;
  status: RelationshipStatus;
  discountRate: number;
  manufacturer: RelationshipParty;
  retailer: RelationshipParty;
}

function toParty(row: Record<string, unknown> | null): RelationshipParty {
  return {
    id: (row?.id as string) ?? '',
    companyName: (row?.company_name as string) ?? '—',
    vknTc: (row?.vkn_tc as string) ?? '—',
    isSubscriber: (row?.is_subscriber as boolean) ?? false,
  };
}

async function fetchRelationships(
  status: RelationshipStatus | 'all',
  cursor?: Cursor,
): Promise<AdminRelationship[]> {
  let q = supabase
    .from('relationships')
    .select(RELATIONSHIP_LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE);

  if (status !== 'all') q = q.eq('status', status);
  if (cursor) q = q.or(keysetFilter(cursor));

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((raw) => {
    const row = raw as unknown as Record<string, unknown>;
    return {
      id: row.id as string,
      createdAt: row.created_at as string,
      status: row.status as RelationshipStatus,
      discountRate: Number(row.discount_rate ?? 0),
      manufacturer: toParty(row.manufacturer as Record<string, unknown> | null),
      retailer: toParty(row.retailer as Record<string, unknown> | null),
    };
  });
}

/** İlişki grafiği — köprünün eşleşme tablosunun yerini alan tek kaynak. */
export function useRelationshipList(status: RelationshipStatus | 'all') {
  return useInfiniteQuery({
    queryKey: ['admin', 'relationships', status],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) => fetchRelationships(status, pageParam),
    getNextPageParam: (lastPage) => nextCursor(lastPage, PAGE_SIZE),
  });
}

export interface AdminSubscriptionRequest {
  id: string;
  note: string | null;
  requestedPlan: Plan | null;
  createdAt: string;
  org: { id: string; companyName: string; vknTc: string; kind: string };
}

/** Bekleyen abonelik talepleri — tek tıkla onaylanır. */
export function usePendingSubscriptionRequests() {
  return useQuery({
    queryKey: ['admin', 'subscription-requests'],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<AdminSubscriptionRequest[]> => {
      const { data, error } = await supabase
        .from('subscription_requests')
        .select(SUBSCRIPTION_REQUEST_COLUMNS)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(PAGE_SIZE);
      if (error) throw error;

      return (data ?? []).map((raw) => {
        const row = raw as unknown as Record<string, unknown>;
        const org = (row.organization ?? {}) as unknown as Record<string, unknown>;
        return {
          id: row.id as string,
          note: (row.note as string | null) ?? null,
          requestedPlan: (row.requested_plan as Plan | null) ?? null,
          createdAt: row.created_at as string,
          org: {
            id: org.id as string,
            companyName: (org.company_name as string) ?? '—',
            vknTc: (org.vkn_tc as string) ?? '—',
            kind: (org.kind as string) ?? '',
          },
        };
      });
    },
  });
}
