import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import {
  mapRetailerTeamMember,
  mapRetailerInvitation,
  type RetailerTeamMember,
  type RetailerInvitation,
} from './model';

export function useRetailerTeamMembers(orgId: string | null) {
  return useQuery<RetailerTeamMember[]>({
    queryKey: ['retailer-team', 'members', orgId],
    staleTime: STALE_TIME.session,
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('users')
        .select('id, org_id, org_role, is_active, email, created_at')
        .eq('org_id', orgId)
        .in('org_role', ['staff', 'accountant'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapRetailerTeamMember(r as unknown as Record<string, unknown>));
    },
  });
}

export function useRetailerInvitations(orgId: string | null) {
  return useQuery<RetailerInvitation[]>({
    queryKey: ['retailer-team', 'invitations', orgId],
    staleTime: STALE_TIME.session,
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('retailer_invitations')
        .select('id, org_id, email, role, token, expires_at, used_at, created_at')
        .eq('org_id', orgId)
        .is('used_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapRetailerInvitation(r as unknown as Record<string, unknown>));
    },
  });
}
