import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import type { Invitation } from '../domain/invitation';

// Açık kolon listesi (kilitli kural 19).
const COLUMNS =
  'id, token, company_name, email, phone, authorized_name, vkn_tc, discount_rate,' +
  ' expires_at, used_at, revoked_at, created_at';

export interface Cursor {
  createdAt: string;
  id: string;
}

function toInvitation(raw: unknown): Invitation {
  const row = raw as Record<string, unknown>;
  return {
    id: row.id as string,
    token: row.token as string,
    companyName: (row.company_name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    authorizedName: (row.authorized_name as string | null) ?? null,
    vknTc: (row.vkn_tc as string | null) ?? null,
    discountRate: Number(row.discount_rate ?? 0),
    expiresAt: row.expires_at as string,
    usedAt: (row.used_at as string | null) ?? null,
    revokedAt: (row.revoked_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

async function fetchPage(cursor?: Cursor): Promise<Invitation[]> {
  // RLS yalnız kendi davetlerimi döndürür — ayrıca org filtresi yazılmaz.
  let q = supabase
    .from('invitations')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    q = q.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toInvitation);
}

/** Gönderilen davetler — keyset sayfalama (A17). */
export function useInvitations() {
  return useInfiniteQuery({
    queryKey: ['invitations'],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last ? { createdAt: last.createdAt, id: last.id } : undefined;
    },
  });
}
