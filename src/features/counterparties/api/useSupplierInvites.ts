import { useCreateInvitation, useInvitations, useRevokeInvitation } from '@/features/invitations';

interface InviteValues {
  companyName: string;
  email: string;
  phone: string;
  vknTc: string;
  discountRate: number;
}

/**
 * WhatsApp üretici davetleri — liste, oluşturma, iptal.
 *
 * Davet ilişkiden bağımsızdır: karşı taraf linki kullanana kadar ortada
 * `relationships` satırı yoktur, bu yüzden ayrı bir hook.
 */
export function useSupplierInvites() {
  const list = useInvitations();
  const create = useCreateInvitation();
  const revoke = useRevokeInvitation();

  return {
    invitations: list.data?.pages.flat() ?? [],
    loading: list.isPending,
    create,
    revoke,
    /**
     * Boş alanların anahtarı hiç gönderilmez — `exactOptionalPropertyTypes`
     * açıkken `undefined` atamak da yasak; RPC kendi varsayılanını uygular.
     */
    send: (v: InviteValues, onDone: () => void) =>
      create.mutate(
        {
          ...(v.companyName ? { companyName: v.companyName } : {}),
          ...(v.email ? { email: v.email } : {}),
          ...(v.phone ? { phone: v.phone } : {}),
          ...(v.vknTc ? { vknTc: v.vknTc } : {}),
          discountRate: v.discountRate,
          validDays: 14,
        },
        { onSuccess: onDone },
      ),
  };
}
