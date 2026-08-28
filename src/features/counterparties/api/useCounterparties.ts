import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME, type RelationshipStatus } from '@/constants';
import { useAuthSession } from '@/features/auth';
import type { Edge, Party } from '../domain/counterparty';

// Açık kolon listesi (kilitli kural 19). İki uç da çekilir; "karşı taraf"
// çevirisi domain/counterparty.ts içinde yapılır.
const PARTY = 'id, company_name, vkn_tc, is_subscriber, phone, email, authorized_name, address';
// Gömme ipucu KISIT ADIYLA verilir, kolon adıyla değil.
// Sebep: A15 gereği `relationships` → `organizations` yabancı anahtarı BİLEŞİK
// ((org_id, kind) → (id, kind)); PostgREST tek kolonluk ipucu ile bileşik bir
// kısıtı çözemez ve "Could not find a relationship ... in the schema cache"
// hatası döner. Canlıda liste tamamen boş kalıyordu.
const MFR_FK = 'relationships_manufacturer_org_id_manufacturer_kind_fkey';
const RTL_FK = 'relationships_retailer_org_id_retailer_kind_fkey';
const EDGE_COLUMNS =
  `id, status, discount_rate, created_at, initiated_by_org_id, manufacturer_org_id, can_edit_catalog, ` +
  `manufacturer:organizations!${MFR_FK}(${PARTY}), retailer:organizations!${RTL_FK}(${PARTY})`;

export interface Cursor {
  createdAt: string;
  id: string;
}

function toParty(row: Record<string, unknown> | null): Party {
  return {
    id: (row?.id as string) ?? '',
    companyName: (row?.company_name as string) ?? '—',
    vknTc: (row?.vkn_tc as string) ?? '—',
    isSubscriber: (row?.is_subscriber as boolean) ?? false,
    phone: (row?.phone as string | null) ?? null,
    email: (row?.email as string | null) ?? null,
    authorizedName: (row?.authorized_name as string | null) ?? null,
    address: (row?.address as string | null) ?? null,
  };
}

function toEdge(raw: unknown): Edge {
  const row = raw as Record<string, unknown>;
  return {
    id: row.id as string,
    status: row.status as RelationshipStatus,
    discountRate: Number(row.discount_rate ?? 0),
    createdAt: row.created_at as string,
    initiatedByOrgId: row.initiated_by_org_id as string,
    manufacturerOrgId: row.manufacturer_org_id as string,
    manufacturer: toParty(row.manufacturer as Record<string, unknown> | null),
    retailer: toParty(row.retailer as Record<string, unknown> | null),
    canEditCatalog: (row.can_edit_catalog as boolean) ?? true,
  };
}

async function fetchPage(
  targetOrgId?: string,
  isSubscriber?: boolean,
  activeSponsorId?: string | null,
  cursor?: Cursor,
): Promise<Edge[]> {
  let q = supabase
    .from('relationships')
    .select(EDGE_COLUMNS);

  if (targetOrgId) {
    if (isSubscriber === false && activeSponsorId) {
      // Misafir yalnız oturum açtığı sponsor üreticiyi/perakendeciyi görür (A16).
      q = q.or(
        `and(retailer_org_id.eq.${targetOrgId},manufacturer_org_id.eq.${activeSponsorId}),and(manufacturer_org_id.eq.${targetOrgId},retailer_org_id.eq.${activeSponsorId})`,
      );
    } else {
      q = q.or(`manufacturer_org_id.eq.${targetOrgId},retailer_org_id.eq.${targetOrgId}`);
    }
  }

  q = q
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
  return (data ?? []).map(toEdge);
}

/** Müşterilerim / Tedarikçilerim listesi — keyset sayfalama (A17). */
export function useCounterparties(customOrgId?: string) {
  const { data: session } = useAuthSession();
  const org = session?.org;
  const orgId = customOrgId ?? org?.id;
  const isSubscriber = org?.isSubscriber;
  const activeSponsorId = session?.sponsorOrgId || org?.createdByOrgId;

  return useInfiniteQuery({
    queryKey: ['counterparties', orgId, isSubscriber, activeSponsorId],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) => fetchPage(orgId, isSubscriber, activeSponsorId, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last ? { createdAt: last.createdAt, id: last.id } : undefined;
    },
    enabled: !!orgId,
  });
}
