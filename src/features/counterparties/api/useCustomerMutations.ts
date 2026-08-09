import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rpcArgs } from '@/lib/rpc';
import type { RelationshipStatus } from '@/constants';

export interface CreateCustomerInput {
  vknTc: string;
  companyName?: string;
  authorizedName?: string;
  email?: string;
  phone?: string;
  address?: string;
  discountRate?: number;
  userCode?: string;
  /** Boş bırakılırsa giriş hesabı açılmaz — yalnız cari kart oluşur. */
  password?: string;
}

export interface CreateCustomerResult {
  orgId: string;
  alreadyExisted: boolean;
  /**
   * `active` → cari hesap AÇILDI ve hemen kullanılabilir.
   * `pending` → karşı taraf abone; onayladığında ilişki ve cari hesap aktifleşir.
   */
  status: RelationshipStatus;
  accountCreated: boolean;
  userCode?: string;
}

const MESSAGES: Record<string, string> = {
  WEAK_PASSWORD: 'Şifre en az 8 karakter olmalı ve bir harf ile bir rakam içermeli.',
  INVALID_USER_CODE: 'Kullanıcı kodu 3-32 karakter, yalnız küçük harf ve rakam olabilir.',
  USER_CODE_TAKEN: 'Bu kullanıcı kodu başka bir hesapta kullanılıyor.',
  SELF_REFERENCE: 'Kendi vergi numaranızı ekleyemezsiniz.',
  KIND_MISMATCH: 'Bu numara aynı tipte bir firmaya ait; bağlantı kurulamaz.',
  NOT_SUBSCRIBER: 'Müşteri eklemek için abone olmanız gerekir.',
  TARGET_IS_SUBSCRIBER: 'Bu firma abone; kaydını ve şifresini yalnız kendisi yönetir.',
  NOT_MY_COUNTERPARTY: 'Bu firma sizin müşteriniz değil.',
  NO_OWNER_USER: 'Bu firmanın henüz giriş hesabı yok.',
  DEFAULT: 'İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.',
};

export class CustomerError extends Error {
  constructor(public readonly code: string) {
    super(MESSAGES[code] ?? MESSAGES.DEFAULT!);
    this.name = 'CustomerError';
  }
}

async function toCustomerError(error: { context?: Response } | null): Promise<CustomerError> {
  try {
    const body = (await error?.context?.json()) as { error?: string } | undefined;
    if (body?.error) return new CustomerError(body.error);
  } catch {
    // Gövde okunamadı; genel mesaj yeterli.
  }
  return new CustomerError('DEFAULT');
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['counterparties'] });
    // Cari hesap listesi ilişkilerden türer; yeni müşteri hemen görünmeli.
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };
}

/**
 * Müşteriyi cari kartı ve (istenirse) giriş hesabıyla birlikte açar.
 *
 * Cari hesap AYRI bir kayıt değildir: ilişkinin kendisidir. İlişki `active`
 * olduğu anda cari hesap ₺0 bakiyeyle kullanılabilir; `pending` ise karşı
 * taraf onayladığında açılır.
 */
export function useCreateCustomer() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (input: CreateCustomerInput): Promise<CreateCustomerResult> => {
      const { data, error } = (await supabase.functions.invoke<CreateCustomerResult>(
        'create-customer',
        { body: input },
      )) as { data: CreateCustomerResult | null; error: { context?: Response } | null };

      if (error) throw await toCustomerError(error);
      if (!data) throw new CustomerError('DEFAULT');
      return data;
    },
    onSuccess: invalidate,
  });
}

export interface UpdateCustomerInput {
  orgId: string;
  companyName?: string;
  authorizedName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

/** Misafir müşterinin firma kartını günceller. Abone müşteride sunucu reddeder. */
export function useUpdateCustomer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: UpdateCustomerInput) => {
      const { error } = await supabase.rpc(
        'update_counterparty_profile',
        rpcArgs({
          p_org_id: input.orgId,
          p_company_name: input.companyName,
          p_authorized_name: input.authorizedName,
          p_email: input.email,
          p_phone: input.phone,
          p_address: input.address,
        }),
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * Misafir müşterinin şifresini yeniler.
 *
 * Yalnız MİSAFİR: abone bir müşterinin hesabı kendisine aittir, sponsor onun
 * şifresini değiştiremez — sunucu da reddeder.
 */
export function useResetCustomerPassword() {
  return useMutation({
    mutationFn: async ({ orgId, newPassword }: { orgId: string; newPassword: string }) => {
      const { error } = (await supabase.functions.invoke('update-user-password', {
        body: { mode: 'sponsor_reset', orgId, newPassword },
      })) as { error: { context?: Response } | null };

      if (error) throw await toCustomerError(error);
    },
  });
}
