import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';

const COLUMNS =
  'id, title, body, is_active, created_at, owner_org_id, target_retailer_org_id, ' +
  'owner:owner_org_id(company_name)';

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export interface Announcement {
  id: string;
  title: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  ownerOrgId: string;
  ownerName: string;
  /** Doluysa duyuru tek bir perakendeciye özeldir. */
  targetRetailerOrgId: string | null;
}

function toAnnouncement(raw: unknown): Announcement {
  const r = raw as Row;
  const owner = (r.owner && typeof r.owner === 'object' ? r.owner : {}) as Row;
  return {
    id: str(r.id),
    title: str(r.title),
    body: str(r.body),
    isActive: r.is_active as boolean,
    createdAt: str(r.created_at),
    ownerOrgId: str(r.owner_org_id),
    ownerName: str(owner.company_name) || '—',
    targetRetailerOrgId: typeof r.target_retailer_org_id === 'string'
      ? r.target_retailer_org_id
      : null,
  };
}

/** Duyurular — RLS hem sahibi hem aktif müşteriyi kapsar. Keyset sayfalama (A17). */
export function useAnnouncements() {
  return useInfiniteQuery({
    queryKey: ['announcements'],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('announcements')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);
      if (pageParam) {
        q = q.or(
          `created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(toAnnouncement);
    },
    getNextPageParam: (last) => {
      if (last.length < PAGE_SIZE) return undefined;
      const l = last[last.length - 1];
      return l ? { createdAt: l.createdAt, id: l.id } : undefined;
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['announcements'] });
}

export function usePublishAnnouncement() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { ownerOrgId: string; title: string; body: string }) => {
      const { error } = await supabase.from('announcements').insert({
        owner_org_id: input.ownerOrgId,
        title: input.title,
        body: input.body,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetAnnouncementActive() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      // Soft delete (kilitli kural 16).
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Okundu işareti — yalnız okuyan perakendeci yazabilir (RLS). */
export function useMarkRead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, retailerOrgId }: { id: string; retailerOrgId: string }) => {
      const { error } = await supabase
        .from('announcement_reads')
        .upsert(
          { announcement_id: id, retailer_org_id: retailerOrgId },
          { onConflict: 'announcement_id,retailer_org_id' },
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
