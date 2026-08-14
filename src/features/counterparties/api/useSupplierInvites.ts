import { useState } from 'react';
import { useInvitations, useRevokeInvitation } from '@/features/invitations';
import { buildInviteMessage, inviteUrl, whatsappShareUrl } from '@/features/invitations';
import { useCreateCustomer } from './useCustomerMutations';
import { useAuthSession } from '@/features/auth';

interface InviteValues {
  companyName: string;
  phone: string;
  vknTc: string;
  password: string;
}

/** Davet oluşturulduktan sonra ekranda gösterilecek özet. */
export interface InviteSent {
  companyName: string;
  userCode: string;
  link: string;
  whatsappUrl: string | null;
}

/**
 * WhatsApp üretici davetleri — liste, oluşturma, iptal.
 *
 * HESAP DAVET ANINDA KURULUR. Daveti gönderen firma adını, VKN'yi ve şifreyi
 * zaten giriyor; karşı tarafa doldurulacak bir form kalmıyor. Böylece şifre
 * hiçbir yerde açık metin beklemez — doğrudan auth'a yazılıp unutulur.
 *
 * Link kabul etmeye değil, karşı tarafa giriş bilgilerini göstermeye yarar.
 */
export function useSupplierInvites() {
  const { data: user } = useAuthSession();
  const list = useInvitations();
  const revoke = useRevokeInvitation();
  const create = useCreateCustomer();
  const [sent, setSent] = useState<InviteSent | null>(null);

  return {
    invitations: list.data?.pages.flat() ?? [],
    loading: list.isPending,
    create,
    revoke,
    sent,
    clearSent: () => setSent(null),

    send: (v: InviteValues, onDone: () => void) =>
      create.mutate(
        {
          vknTc: v.vknTc,
          companyName: v.companyName,
          phone: v.phone,
          password: v.password,
          withInviteLink: true,
        },
        {
          onSuccess: (result) => {
            onDone();
            if (!result.inviteToken) return;

            const origin = window.location.origin;
            const userCode = result.userCode ?? v.vknTc;
            const message = buildInviteMessage({
              inviterName: user?.org?.companyName ?? 'KÖPRÜ',
              userCode,
              sponsorVkn: user?.org?.vknTc ?? '',
              password: v.password,
              token: result.inviteToken,
              origin,
            });

            setSent({
              companyName: v.companyName,
              userCode,
              link: inviteUrl(result.inviteToken, origin),
              whatsappUrl: whatsappShareUrl(v.phone, message),
            });
          },
        },
      ),
  };
}
