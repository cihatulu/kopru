import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface UpgradeInput {
  orgId: string;
  subdomain: string;
}

export interface UpgradeResult {
  /** Owner girişi bu çağrıda açıldıysa geçici şifre bir kez döner. */
  tempPassword?: string;
  userCode?: string;
  ownerCreated: boolean;
}

interface ProvisionResponse {
  created: boolean;
  userCode: string;
  tempPassword?: string;
}

// supabase-js `error` alanını `any` olarak tipler; sonucu açıkça daraltıyoruz.
interface ProvisionInvokeResult {
  data: ProvisionResponse | null;
  error: unknown;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['admin'] });
}

/**
 * TEK TIK ABONEYE YÜKSELTME.
 *
 * İki adım, ikisi de sunucuda:
 *   1. `upgrade_org_to_subscriber` RPC — bayrak + plan + subdomain + modüller.
 *      İlişkilere DOKUNMAZ; misafirin sipariş geçmişi ve cari bakiyesi yerinde kalır.
 *   2. `admin-provision-owner` — org'un giriş yapabilmesi için owner hesabı.
 */
export function useUpgradeOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, subdomain }: UpgradeInput): Promise<UpgradeResult> => {
      const { error } = await supabase.rpc('upgrade_org_to_subscriber', {
        p_org_id: orgId,
        p_plan: 'pro',
        p_subdomain: subdomain,
      });
      if (error) throw error;

      const { data, error: provisionError } = (await supabase.functions.invoke<ProvisionResponse>(
        'admin-provision-owner',
        { body: { orgId } },
      )) as ProvisionInvokeResult;
      // Yükseltme başarılı; owner sağlama ayrıca denenebilir, yükseltmeyi geri almayız.
      if (provisionError || !data) return { ownerCreated: false };

      return {
        ownerCreated: data.created,
        userCode: data.userCode,
        ...(data.tempPassword ? { tempPassword: data.tempPassword } : {}),
      };
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDowngradeOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.rpc('downgrade_org_to_guest', { p_org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useSetOrgActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, isActive }: { orgId: string; isActive: boolean }) => {
      // KİLİTLİ KURAL 16: soft delete varsayılan; gerçek DELETE yok.
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: isActive })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useSetRelationshipStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'passive' }) => {
      const { error } = await supabase.rpc('admin_set_relationship_status', {
        p_relationship_id: id,
        p_status: status,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDecideSubscriptionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requestId: string;
      approve: boolean;
      subdomain?: string;
    }) => {
      const { error } = await supabase.rpc('decide_subscription_request', {
        p_request_id: input.requestId,
        p_approve: input.approve,
        p_plan: input.approve ? 'pro' : null,
        p_subdomain: input.subdomain ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient),
  });
}
