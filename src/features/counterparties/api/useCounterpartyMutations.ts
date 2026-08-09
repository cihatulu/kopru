import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import type { Plan, RelationshipStatus } from '@/constants';

export interface AddCounterpartyInput {
  vknTc: string;
  companyName?: string;
  email?: string;
  phone?: string;
  authorizedName?: string;
  discountRate?: number;
}

export interface AddCounterpartyResult {
  relationshipId: string;
  orgId: string;
  /** Karşı taraf sistemde yoktu, misafir olarak açıldı. */
  orgCreated: boolean;
  /** `pending` ise karşı taraf da abone; onayı bekleniyor. */
  status: RelationshipStatus;
  alreadyExisted: boolean;
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['counterparties'] });
    void queryClient.invalidateQueries({ queryKey: ['auth-session'] });
  };
}

/**
 * Karşı taraf ekleme — ekosistemin büyüme mekanizması.
 *
 * Üç sonuç mümkün, üçü de sunucuda belirlenir:
 *   · VKN sistemde yok  → misafir org açılır, ilişki hemen aktif
 *   · VKN var, misafir  → mevcut düğüme yeni kenar, hemen aktif (kopya org AÇILMAZ)
 *   · VKN var, abone    → kenar `pending`; karşı tarafın onayı gerekir
 */
export function useAddCounterparty() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (input: AddCounterpartyInput): Promise<AddCounterpartyResult> => {
      const { data, error } = await supabase.rpc('add_counterparty', rpcArgs({
        p_vkn_tc: input.vknTc,
        p_company_name: input.companyName ?? undefined,
        p_email: input.email ?? undefined,
        p_phone: input.phone ?? undefined,
        p_authorized_name: input.authorizedName ?? undefined,
        p_discount_rate: input.discountRate ?? 0,
      }));
      if (error) throw error;

      // RPC bileşik tip döner; gevşek yer tutucu tipler yüzünden alan alan okuyoruz.
      const row: Record<string, unknown> = data;
      return {
        relationshipId: row.relationship_id as string,
        orgId: row.org_id as string,
        orgCreated: row.org_created as boolean,
        status: row.status as RelationshipStatus,
        alreadyExisted: row.already_existed as boolean,
      };
    },
    onSuccess: invalidate,
  });
}

/** Gelen bağlantı isteğini onaylar veya reddeder. */
export function useRespondToConnection() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ relationshipId, accept }: { relationshipId: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_to_connection_request', rpcArgs({
        p_relationship_id: relationshipId,
        p_accept: accept,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetCounterpartyStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      relationshipId,
      status,
    }: {
      relationshipId: string;
      status: 'active' | 'passive';
    }) => {
      const { error } = await supabase.rpc('set_counterparty_status', rpcArgs({
        p_relationship_id: relationshipId,
        p_status: status,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** İskonto yalnız üretici tarafından belirlenir (A5). */
export function useSetCounterpartyDiscount() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      relationshipId,
      discountRate,
    }: {
      relationshipId: string;
      discountRate: number;
    }) => {
      const { error } = await supabase.rpc('set_counterparty_discount', rpcArgs({
        p_relationship_id: relationshipId,
        p_discount_rate: discountRate,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Misafirin "kendi panelimi açmak istiyorum" talebi (PLAN §5). */
export function useRequestSubscription() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ plan, note }: { plan?: Plan; note?: string }) => {
      const { error } = await supabase.rpc('request_subscription', rpcArgs({
        p_plan: plan ?? undefined,
        p_note: note ?? undefined,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
