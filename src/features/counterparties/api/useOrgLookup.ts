import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rpcArgs } from '@/lib/rpc';
import { STALE_TIME, type OrgKind, type RelationshipStatus } from '@/constants';
import { isValidVknTc, normalizeVknTc } from '@/lib/tckn';
import type { OrgLookup } from '../domain/vknLookup';

/**
 * VKN ile firma arar — "bu numara sistemde var mı" sorusunun cevabı.
 *
 * Doğrudan tablo sorgusu İŞE YARAMAZ: `organizations` politikası yalnız kendi
 * org'umu ve ilişkili olduklarımı gösterir, oysa sorunun amacı tam da henüz
 * ilişkim OLMAYAN bir firmayı bulmaktır. Bu yüzden SECURITY DEFINER bir RPC.
 *
 * Sorgu yalnız GEÇERLİ bir numara yazıldığında çalışır: her tuşta sunucuya
 * gitmek hem gereksiz hem de numara taramasını kolaylaştırırdı.
 */
export function useOrgLookup(vknTc: string) {
  const normalized = normalizeVknTc(vknTc);
  const valid = isValidVknTc(normalized);

  return useQuery({
    queryKey: ['counterparties', 'lookup', normalized],
    enabled: valid,
    staleTime: STALE_TIME.session,
    retry: false,
    queryFn: async (): Promise<OrgLookup> => {
      const { data, error } = await supabase.rpc(
        'lookup_org_by_vkn',
        rpcArgs({ p_vkn_tc: normalized }),
      );
      if (error) throw error;

      const r = (data ?? {}) as Record<string, unknown>;
      return {
        found: Boolean(r.found),
        orgId: (r.org_id as string | null) ?? null,
        companyName: (r.company_name as string | null) ?? null,
        kind: (r.kind as OrgKind | null) ?? null,
        isSubscriber: Boolean(r.is_subscriber),
        relationshipStatus: (r.relationship_status as RelationshipStatus | null) ?? null,
        hasLogin: Boolean(r.has_login),
      };
    },
  });
}
