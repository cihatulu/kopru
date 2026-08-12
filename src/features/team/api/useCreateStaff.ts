import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { edgeErrorCode, type EdgeResult } from '@/lib/edgeError';
import { STAFF_ERROR_MESSAGES, type StaffRole } from '../domain/staff';

export class StaffError extends Error {
  constructor(public readonly code: string) {
    super(STAFF_ERROR_MESSAGES[code] ?? STAFF_ERROR_MESSAGES.DEFAULT!);
    this.name = 'StaffError';
  }
}

export function useTeamInvalidate() {
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
  userCode?: string;
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
  const invalidate = useTeamInvalidate();

  return useMutation({
    mutationFn: async (input: CreateStaffInput): Promise<CreateStaffResult> => {
      const { data, error } = (await supabase.functions.invoke<CreateStaffResult>('create-staff', {
        body: input,
      })) as EdgeResult<CreateStaffResult>;

      if (error) throw new StaffError(await edgeErrorCode(error));
      if (!data?.userCode) throw new StaffError('DEFAULT');
      return data;
    },
    onSuccess: invalidate,
  });
}
