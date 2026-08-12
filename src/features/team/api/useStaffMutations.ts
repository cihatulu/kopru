import { useMutation } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { edgeErrorCode, type EdgeError } from '@/lib/edgeError';
import { StaffError, useTeamInvalidate } from './useCreateStaff';

export function useSetStaffRole() {
  const invalidate = useTeamInvalidate();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'staff' | 'accountant' }) => {
      const { error } = await supabase.rpc('set_staff_role', rpcArgs({
        p_user_id: userId,
        p_role: role,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetStaffActive() {
  const invalidate = useTeamInvalidate();
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase.rpc('set_staff_active', rpcArgs({
        p_user_id: userId,
        p_is_active: isActive,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * Personelin müşteri kapsamını belirler.
 *
 * Liste TÜMÜYLE değiştirilir (sunucu önce siler, sonra yazar) — kısmi ekleme
 * çıkarma iki istemci arasında yarışsaydı kapsam sessizce birleşirdi.
 */
export function useSetStaffScope() {
  const invalidate = useTeamInvalidate();
  return useMutation({
    mutationFn: async ({
      staffUserId,
      retailerOrgIds,
    }: {
      staffUserId: string;
      retailerOrgIds: string[];
    }) => {
      const { error } = await supabase.rpc('set_staff_scope', rpcArgs({
        p_staff_user_id: staffUserId,
        p_retailer_org_ids: retailerOrgIds,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export interface UpdateStaffInput {
  userId: string;
  fullName?: string;
  userCode?: string;
  email?: string;
  phone?: string;
  role?: 'staff' | 'accountant';
}

/** Personel bilgileri Edge Function'dan, rol RPC'den — ikisi ayrı yetki kapısı. */
export function useUpdateStaff() {
  const invalidate = useTeamInvalidate();
  return useMutation({
    mutationFn: async ({ userId, role, ...updates }: UpdateStaffInput) => {
      const { error: edgeError } = (await supabase.functions.invoke('update-user-password', {
        body: { mode: 'staff_update', userId, updates },
      })) as { error: EdgeError | null };

      if (edgeError) throw new StaffError(await edgeErrorCode(edgeError));

      if (role) {
        const { error } = await supabase.rpc('set_staff_role', rpcArgs({
          p_user_id: userId,
          p_role: role,
        }));
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

/** Şifre TEK YOL: `update-user-password` Edge Function (kilitli kural 2). */
export function useResetStaffPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { error } = (await supabase.functions.invoke('update-user-password', {
        body: { mode: 'staff_update', userId, updates: { password: newPassword } },
      })) as { error: EdgeError | null };

      if (error) throw new StaffError(await edgeErrorCode(error));
    },
  });
}
