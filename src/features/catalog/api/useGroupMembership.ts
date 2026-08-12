import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
  };
}

/**
 * Seçili ürünleri bir gruba atar (grup null ise gruptan çıkarır).
 *
 * Tek RPC, tek transaction: ürün başına ayrı çağrı yapılsaydı sekiz üründen
 * beşi taşınıp üçü yerinde kalabilirdi.
 */
export function useAssignProductsToGroup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      productIds,
      groupId,
      ownerOrgId,
    }: {
      productIds: string[];
      groupId: string | null;
      ownerOrgId?: string;
    }): Promise<number> => {
      const { data, error } = await supabase.rpc('assign_products_to_group', rpcArgs({
        p_product_ids: productIds,
        p_group_id: groupId ?? undefined,
        p_owner_org_id: ownerOrgId ?? undefined,
      }));
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: invalidate,
  });
}

/**
 * Yeni grup açar ve seçili ürünleri oraya atar.
 *
 * İki çağrı tek mutasyonda zincirleniyor: bileşende iç içe `onSuccess`
 * geri çağrılarıyla yazılsaydı hata yolu (grup açıldı ama atama düştü)
 * gözden kaçardı. Burada ikinci adım başarısız olursa mutasyon hata verir
 * ve kullanıcı bunu görür — grup açık kalır, ürünler atanmamıştır.
 */
export function useAssignToNewGroup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      name,
      productIds,
      ownerOrgId,
    }: {
      name: string;
      productIds: string[];
      ownerOrgId?: string;
    }): Promise<number> => {
      const { data: groupId, error: groupError } = await supabase.rpc('save_product_group', rpcArgs({
        p_id: undefined,
        p_name: name,
        p_sort_order: 0,
        p_owner_org_id: ownerOrgId ?? undefined,
      }));
      if (groupError) throw groupError;

      const { data, error } = await supabase.rpc('assign_products_to_group', rpcArgs({
        p_product_ids: productIds,
        p_group_id: groupId,
        p_owner_org_id: ownerOrgId ?? undefined,
      }));
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: invalidate,
  });
}

/** Grubun içeriğini verilen listeye EŞİTLER; listede olmayanlar gruptan çıkar. */
export function useSetGroupProducts() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      groupId,
      productIds,
      ownerOrgId,
    }: {
      groupId: string;
      productIds: string[];
      ownerOrgId?: string;
    }): Promise<number> => {
      const { data, error } = await supabase.rpc('set_group_products', rpcArgs({
        p_group_id: groupId,
        p_product_ids: productIds,
        p_owner_org_id: ownerOrgId ?? undefined,
      }));
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: invalidate,
  });
}
