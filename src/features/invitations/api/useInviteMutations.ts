import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Invitation } from '../domain/invitation';

export interface CreateInviteInput {
  companyName?: string;
  authorizedName?: string;
  phone?: string;
  email?: string;
  vknTc?: string;
  discountRate?: number;
  validDays?: number;
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    void queryClient.invalidateQueries({ queryKey: ['counterparties'] });
  };
}

/**
 * Davet oluşturur ve token'ı geri alır.
 *
 * Token İSTEMCİDE ÜRETİLMEZ — sunucu `gen_random_bytes` ile üretir. İstemcinin
 * ürettiği bir token, tarayıcının rastgeleliği kadar tahmin edilebilir olurdu.
 */
export function useCreateInvitation() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (input: CreateInviteInput): Promise<Invitation> => {
      const { data, error } = await supabase.rpc('create_invitation', {
        p_company_name: input.companyName ?? null,
        p_email: input.email ?? null,
        p_phone: input.phone ?? null,
        p_authorized_name: input.authorizedName ?? null,
        p_vkn_tc: input.vknTc ?? null,
        p_discount_rate: input.discountRate ?? 0,
        p_valid_days: input.validDays ?? 14,
      });
      if (error) throw error;

      const row = data as Record<string, unknown>;
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
        usedAt: null,
        revokedAt: null,
        createdAt: row.created_at as string,
      };
    },
    onSuccess: invalidate,
  });
}

/** Daveti iptal eder — link o anda ölür, kullanılmışsa sunucu reddeder. */
export function useRevokeInvitation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc('revoke_invitation', {
        p_invitation_id: invitationId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
