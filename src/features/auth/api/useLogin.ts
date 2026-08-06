import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LOGIN_ERROR } from '@/constants';
import type { LoginMode, Portal } from '../domain/portals';
import { AUTH_SESSION_KEY } from './useAuthSession';

export interface LoginRequest {
  portal: Portal;
  mode: LoginMode;
  userCode?: string;
  sponsorVkn?: string;
  email?: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

interface InvokeResult {
  data: LoginResponse | null;
  error: { context?: Response } | null;
}

/** Sunucudan gelen hata kodunu kullanıcıya gösterilecek Türkçe metne çevirir. */
export class LoginError extends Error {
  constructor(public readonly code: string) {
    super(messageFor(code));
    this.name = 'LoginError';
  }
}

function messageFor(code: string): string {
  switch (code) {
    case LOGIN_ERROR.locked:
      return 'Çok fazla hatalı deneme. Lütfen 30 saniye sonra tekrar deneyin.';
    case 'INTERNAL':
      return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
    default:
      // Sunucu hangi adımda düşüldüğünü sızdırmaz; istemci de tek mesaj gösterir.
      return 'Giriş bilgileri hatalı.';
  }
}

/**
 * TEK GİRİŞ YOLU (kilitli kural 3).
 * İstemci `users` tablosunu sorgulamaz; tüm doğrulama `login` Edge Function'ında.
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: LoginRequest) => {
      // supabase-js `error` alanını `any` olarak tiplediği için sonucu açıkça daraltıyoruz.
      const { data, error } = (await supabase.functions.invoke<LoginResponse>('login', {
        body: req,
      })) as InvokeResult;

      if (error) {
        // Edge Function 4xx döndüğünde gövdedeki hata kodunu okumaya çalış.
        let code: string = LOGIN_ERROR.invalidCredentials;
        try {
          const body = (await error.context?.json()) as { error?: string } | undefined;
          if (body?.error) code = body.error;
        } catch {
          // Gövde okunamadıysa genel mesaj yeterli.
        }
        throw new LoginError(code);
      }

      if (!data?.access_token) throw new LoginError(LOGIN_ERROR.invalidCredentials);

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw new LoginError('INTERNAL');

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
    },
    onSuccess: () => queryClient.clear(),
  });
}
