import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { STAFF_ERROR_MESSAGES, type StaffRole } from '../domain/staff';

export class StaffError extends Error {
  constructor(public readonly code: string) {
    super(STAFF_ERROR_MESSAGES[code] ?? STAFF_ERROR_MESSAGES.DEFAULT!);
    this.name = 'StaffError';
  }
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['team'] });
  };
}

export interface CreateStaffInput {
  fullName: string;
  role: 'staff' | 'accountant';
  password: string;
  email?: string;
  phone?: string;
}

export interface CreateStaffResult {
  userId: string;
  /** Personelin giriş ekranında kullanacağı kod — sahibin iletmesi gerekir. */
  userCode: string;
  role: StaffRole;
}

/**
 * Personel hesabı açar.
 *
 * Şifre buradan DEĞİL, `create-staff` Edge Function içinde `auth.admin` ile
 * yazılır (kilitli kural 2). İstemci Auth'a doğrudan dokunmaz.
 */
export function useCreateStaff() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (input: CreateStaffInput): Promise<CreateStaffResult> => {
      const { data, error } = (await supabase.functions.invoke<CreateStaffResult>('create-staff', {
        body: input,
      })) as { data: CreateStaffResult | null; error: { context?: Response } | null };

      if (error) {
        let code = 'DEFAULT';
        try {
          const body = (await error.context?.json()) as { error?: string } | undefined;
          if (body?.error) code = body.error;
        } catch {
          // Gövde okunamadıysa genel mesaj yeterli.
        }
        throw new StaffError(code);
      }
      if (!data?.userCode) throw new StaffError('DEFAULT');
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useSetStaffRole() {
  const invalidate = useInvalidate();
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
  const invalidate = useInvalidate();
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
  const invalidate = useInvalidate();
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
