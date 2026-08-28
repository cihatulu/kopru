import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ChangeSelfPasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class ChangePasswordError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'ChangePasswordError';
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  WRONG_CURRENT_PASSWORD: 'Mevcut şifreniz hatalı.',
  PASSWORD_ALREADY_TAKEN: 'Bu şifre firmanızdaki başka bir personel veya yetkili tarafından kullanılıyor.',
  WEAK_PASSWORD: 'Yeni şifre en az 8 karakter olmalı, en az bir harf ve bir rakam içermelidir.',
  UNAUTHORIZED: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
  UPDATE_FAILED: 'Şifre güncellenemedi. Lütfen tekrar deneyin.',
};

export function useChangeSelfPassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: ChangeSelfPasswordInput) => {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          mode: 'self',
          currentPassword,
          newPassword,
        },
      });

      if (error) {
        let code = 'UPDATE_FAILED';
        try {
          // FunctionsHttpError contains response json
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) code = body.error;
          }
        } catch {
          // ignore
        }
        throw new ChangePasswordError(code, ERROR_MESSAGES[code] ?? 'Şifre güncellenemedi.');
      }

      if (data?.error) {
        const code = data.error;
        throw new ChangePasswordError(code, ERROR_MESSAGES[code] ?? 'Şifre güncellenemedi.');
      }

      return data;
    },
  });
}
