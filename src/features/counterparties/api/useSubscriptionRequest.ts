import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rpcArgs } from '@/lib/rpc';
import { STALE_TIME, type Plan } from '@/constants';

/** Bekleyen abonelik başvurusunun query anahtarı — mutation bunu tazeler. */
const STATUS_KEY = 'subscription-request-status';

/**
 * Misafir org'un bekleyen abonelik başvurusu (varsa).
 *
 * Sorgu ve onu bozan mutation bilerek aynı dosyada: `useRequestSubscription`
 * bu anahtarı invalidate etmezse TopBar'daki banner bayat kalır. İkisi
 * ayrı dosyalara dağıldığında tam olarak bu olmuştu.
 */
export function useSubscriptionStatus(orgId: string | undefined) {
  return useQuery({
    queryKey: [STATUS_KEY, orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME.transactional,
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('subscription_requests')
        .select('id, status, created_at')
        .eq('org_id', orgId)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Misafirin "kendi panelimi açmak istiyorum" talebi (PLAN §5).
 *
 * RPC idempotent: bekleyen başvuru varsa yenisini açmaz, mevcudu döner.
 * `p_plan` DB'de `plan_tier` enum'u — bu yüzden `Plan` tipiyle geçilir,
 * serbest `string` ile değil.
 */
export function useRequestSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plan, note }: { plan?: Plan; note?: string } = {}) => {
      const { data, error } = await supabase.rpc(
        'request_subscription',
        rpcArgs({ p_plan: plan ?? undefined, p_note: note ?? undefined }),
      );
      if (error) throw error;
      return data;
    },
    // Başvuru hem banner'ı (status) hem karşı taraf listelerini etkiler.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [STATUS_KEY] });
      await queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['auth-session'] });
    },
  });
}
