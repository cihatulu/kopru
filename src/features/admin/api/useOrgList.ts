import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME, type OrgKind, type Plan } from '@/constants';
import { keysetFilter, nextCursor, type Cursor } from '../domain/keyset';
import { ORG_LIST_COLUMNS } from './columns';

export interface AdminOrg extends Cursor {
  id: string;
  kind: OrgKind;
  companyName: string;
  vknTc: string;
  email: string | null;
  phone: string | null;
  authorizedName: string | null;
  isSubscriber: boolean;
  plan: Plan | null;
  subdomain: string | null;
  isActive: boolean;
  relationshipCount: number;
  createdByName: string | null;
}

export interface OrgListFilters {
  kind: OrgKind;
  search?: string;
  /** undefined = hepsi, true = yalnız abone, false = yalnız misafir */
  isSubscriber?: boolean;
}

function toOrg(row: Record<string, unknown>): AdminOrg {
  const creatorObj = row.creator as { company_name?: string } | null;
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    kind: row.kind as OrgKind,
    companyName: row.company_name as string,
    vknTc: row.vkn_tc as string,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    authorizedName: (row.authorized_name as string | null) ?? null,
    isSubscriber: row.is_subscriber as boolean,
    plan: (row.plan as Plan | null) ?? null,
    subdomain: (row.subdomain as string | null) ?? null,
    isActive: row.is_active as boolean,
    relationshipCount: (row.active_relationship_count as number | null) ?? 0,
    createdByName: creatorObj?.company_name ?? null,
  };
}

async function fetchPage(filters: OrgListFilters, cursor?: Cursor): Promise<AdminOrg[]> {
  let q = supabase
    .from('organizations')
    .select(ORG_LIST_COLUMNS)
    .eq('kind', filters.kind)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE);

  if (filters.isSubscriber !== undefined) q = q.eq('is_subscriber', filters.isSubscriber);

  const search = filters.search?.trim();
  if (search) {
    // company_name trigram index'li; vkn_tc unique btree.
    q = q.or(`company_name.ilike.%${search}%,vkn_tc.eq.${search}`);
  }

  // Keyset (A17) — OFFSET kullanılmaz.
  if (cursor) q = q.or(keysetFilter(cursor));

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row) => toOrg(row as unknown as Record<string, unknown>));
}

/** Admin org listesi — 55.000 satırda sabit maliyetli sayfalama. */
export function useOrgList(filters: OrgListFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'orgs', filters],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) => fetchPage(filters, pageParam),
    getNextPageParam: (lastPage) => nextCursor(lastPage, PAGE_SIZE),
  });
}
