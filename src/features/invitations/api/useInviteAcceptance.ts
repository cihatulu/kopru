import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME, type OrgKind } from '@/constants';
import { INVITE_ERROR_MESSAGES } from '../domain/inviteErrors';

export interface InvitePreview {
  inviterName: string;
  inviterKind: OrgKind;
  targetKind: OrgKind;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  authorizedName: string | null;
  vknTc: string | null;
  expiresAt: string;
}

export interface AcceptResult {
  ok: true;
  userCode: string;
  /** Misafir girişinde istenen sponsor numarası — kullanıcıya gösterilir. */
  sponsorVkn: string;
  orgCreated: boolean;
  accountCreated: boolean;
}

export class InviteError extends Error {
  constructor(public readonly code: string) {
    super(INVITE_ERROR_MESSAGES[code] ?? INVITE_ERROR_MESSAGES.DEFAULT!);
    this.name = 'InviteError';
  }
}

/** Edge Function hata gövdesinden kodu çıkarır; okunamazsa genel koda düşer. */
async function toInviteError(error: { context?: Response } | null): Promise<InviteError> {
  try {
    const body = (await error?.context?.json()) as { error?: string } | undefined;
    if (body?.error) return new InviteError(body.error);
  } catch {
    // Gövde okunamadı; genel mesaj yeterli.
  }
  return new InviteError('DEFAULT');
}

/**
 * Davet ekranının açılış sorgusu.
 *
 * Oturum YOK — bu yüzden tablo sorgulanmaz, Edge Function çağrılır. Davet
 * tablosunda public bir SELECT politikası bilerek bırakılmadı.
 */
export function useInvitePreview(token: string | undefined) {
  return useQuery({
    queryKey: ['invite-preview', token],
    enabled: !!token,
    retry: false,
    staleTime: STALE_TIME.session,
    queryFn: async (): Promise<InvitePreview> => {
      const { data, error } = (await supabase.functions.invoke<InvitePreview>(
        'accept-invitation',
        { body: { action: 'peek', token } },
      )) as { data: InvitePreview | null; error: { context?: Response } | null };

      if (error) throw await toInviteError(error);
      if (!data) throw new InviteError('DEFAULT');
      return data;
    },
  });
}

export interface AcceptInput {
  token: string;
  vknTc: string;
  companyName: string;
  password: string;
  authorizedName?: string;
  email?: string;
  phone?: string;
}

/** Daveti kabul eder: org + ilişki + giriş hesabı tek çağrıda kurulur. */
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async (input: AcceptInput): Promise<AcceptResult> => {
      const { data, error } = (await supabase.functions.invoke<AcceptResult>('accept-invitation', {
        body: { action: 'accept', ...input },
      })) as { data: AcceptResult | null; error: { context?: Response } | null };

      if (error) throw await toInviteError(error);
      if (!data?.ok) throw new InviteError('DEFAULT');
      return data;
    },
  });
}
