import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { OrgKind } from '@/constants';
import { provisionOwner } from './provisionOwner';

export interface CreateOrgInput {
  kind: OrgKind;
  companyName: string;
  vknTc: string;
  authorizedName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
}

export interface CreateOrgResult {
  companyName: string;
  /** Owner hesabı açılamadıysa null — "Şifre yenile" hesabı sonradan açar. */
  credentials: { userCode: string; tempPassword: string } | null;
}

/**
 * Admin yeni organizasyon açar. Admin tarafından açılan her organizasyon
 * muhakkak suretle ÜYE (abone / is_subscriber: true) olarak doğar.
 *
 * Üye giriş yapabilmeli: kayıttan hemen sonra owner hesabı açılır. Bu adım
 * atlandığında org girişsiz kalıyor ve "Şifre yenile" NO_OWNER_USER veriyordu.
 *
 * `vkn_tc` UNIQUE olduğu için aynı numarayla ikinci kayıt DB tarafından
 * reddedilir — yakınsama anahtarı budur (A3).
 */
export function useCreateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrgInput): Promise<CreateOrgResult> => {
      const { data: org, error } = await supabase.from('organizations').insert({
        kind: input.kind,
        company_name: input.companyName,
        vkn_tc: input.vknTc,
        authorized_name: input.authorizedName ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        is_subscriber: true,
        plan: 'basic',
      }).select('id').single();
      if (error) throw error;

      // Org kaydı geri alınmaz; hesap açılamazsa "Şifre yenile" tekrar dener.
      const owner = await provisionOwner(org.id);
      return {
        companyName: input.companyName,
        credentials: owner?.tempPassword
          ? { userCode: owner.userCode, tempPassword: owner.tempPassword }
          : null,
      };
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
}
