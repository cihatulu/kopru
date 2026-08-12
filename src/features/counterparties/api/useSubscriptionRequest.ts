import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rpcArgs } from '@/lib/rpc';

export function useSubscriptionStatus(orgId: string | undefined) {
  return useQuery({
    queryKey: ['subscription-request-status', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('subscription_requests')
        .select('id, status, created_at')
        .eq('org_id', orgId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) {
        console.error('[useSubscriptionStatus] fetch error:', error);
        return null;
      }
      return data;
    },
    enabled: !!orgId,
  });
}

export function useRequestSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ plan = 'pro', note }: { plan?: string; note?: string } = {}) => {
      const { data, error } = await supabase.rpc(
        'request_subscription',
        rpcArgs({ p_plan: plan, p_note: note }),
      );
      if (error) {
        console.error('[useRequestSubscription] rpc error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription-request-status'] });
    },
  });
}
