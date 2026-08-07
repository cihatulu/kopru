import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { OrgKind } from '@/constants';

export interface CreateOrgInput {
  kind: OrgKind;
  companyName: string;
  vknTc: string;
  authorizedName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
}

/**
 * Admin yeni organizasyon açar. Kayıt MİSAFİR olarak doğar; aboneye yükseltme
 * ayrı ve bilinçli bir adımdır (A2).
 *
 * `vkn_tc` UNIQUE olduğu için aynı numarayla ikinci kayıt DB tarafından
 * reddedilir — yakınsama anahtarı budur (A3).
 */
export function useCreateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrgInput) => {
      const { error } = await supabase.from('organizations').insert({
        kind: input.kind,
        company_name: input.companyName,
        vkn_tc: input.vknTc,
        authorized_name: input.authorizedName ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        is_subscriber: false,
      });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
}
