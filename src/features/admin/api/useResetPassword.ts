import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ResetPasswordResult {
  userCode: string;
  /** Yalnız bu cevapta döner; hiçbir yere kaydedilmez. */
  tempPassword: string;
}

interface InvokeResult {
  data: ResetPasswordResult | null;
  error: { context?: Response } | null;
}

export class ResetPasswordError extends Error {
  constructor(public readonly code: string) {
    super(
      code === 'NO_OWNER_USER'
        ? 'Bu organizasyonun henüz giriş hesabı yok. Önce aboneye yükseltin.'
        : 'Şifre yenilenemedi. Tekrar deneyin.',
    );
    this.name = 'ResetPasswordError';
  }
}

/**
 * Admin, bir organizasyonun owner şifresini yeniler.
 *
 * Şifre yazımı yalnız `update-user-password` Edge Function üzerinden yapılır
 * (kilitli kural 2) — istemci Auth'a doğrudan dokunmaz. Yeni şifre bir kez
 * döner ve saklanmaz; admin onu kullanıcıya iletmekle yükümlüdür.
 */
export function useResetOrgPassword() {
  return useMutation({
    mutationFn: async (orgId: string): Promise<ResetPasswordResult> => {
      const { data, error } = (await supabase.functions.invoke<ResetPasswordResult>(
        'update-user-password',
        { body: { mode: 'admin_reset', orgId } },
      )) as InvokeResult;

      if (error) {
        let code = 'UPDATE_FAILED';
        try {
          const body = (await error.context?.json()) as { error?: string } | undefined;
          if (body?.error) code = body.error;
        } catch {
          // Gövde okunamadıysa genel mesaj yeterli.
        }
        throw new ResetPasswordError(code);
      }
      if (!data?.tempPassword) throw new ResetPasswordError('UPDATE_FAILED');
      return data;
    },
  });
}
