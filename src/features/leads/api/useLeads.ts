import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME, type OrgKind } from '@/constants';
import type { LeadStatus } from '../domain/lead';

const COLUMNS =
  'id, company_name, vkn_tc, kind, city, phone, email, website, source, note, ' +
  'status, matched_org_id, last_contacted_at, created_at';

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const nul = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export interface Lead {
  id: string;
  companyName: string;
  vknTc: string | null;
  kind: OrgKind | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  status: LeadStatus;
  matchedOrgId: string | null;
  createdAt: string;
}

function toLead(raw: unknown): Lead {
  const r = raw as Row;
  return {
    id: str(r.id),
    companyName: str(r.company_name),
    vknTc: nul(r.vkn_tc),
    kind: (r.kind as OrgKind | null) ?? null,
    city: nul(r.city),
    phone: nul(r.phone),
    email: nul(r.email),
    note: nul(r.note),
    status: r.status as LeadStatus,
    matchedOrgId: nul(r.matched_org_id),
    createdAt: str(r.created_at),
  };
}

/** Adaylar — yalnız platform admini görür (RLS). Keyset sayfalama (A17). */
export function useLeads(status: LeadStatus | 'all', search: string) {
  return useInfiniteQuery({
    queryKey: ['leads', status, search],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('leads')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      if (status !== 'all') q = q.eq('status', status);
      if (search.trim()) q = q.ilike('company_name', `%${search.trim()}%`);
      if (pageParam) {
        q = q.or(
          `created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(toLead);
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
  return () => void queryClient.invalidateQueries({ queryKey: ['leads'] });
}

export function useAddLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: {
      companyName: string;
      vknTc?: string;
      kind?: OrgKind;
      city?: string;
      phone?: string;
      email?: string;
      note?: string;
    }) => {
      const { error } = await supabase.from('leads').insert({
        company_name: input.companyName,
        vkn_tc: input.vknTc ?? null,
        kind: input.kind ?? null,
        city: input.city ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetLeadStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from('leads')
        .update({
          status,
          last_contacted_at: status === 'contacted' ? new Date().toISOString() : undefined,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
