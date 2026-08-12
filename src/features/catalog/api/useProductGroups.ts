import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

export interface ProductGroup {
  id: string;
  name: string;
  sortOrder: number;
}

/** Üreticinin ürün grupları. RLS kapsamı zaten sahibiyle sınırlı. */
export function useProductGroups(ownerOrgId?: string) {
  return useQuery({
    queryKey: ['catalog', 'groups', ownerOrgId ?? 'mine'],
    staleTime: STALE_TIME.catalog,
    queryFn: async (): Promise<ProductGroup[]> => {
      let q = supabase
        .from('product_groups')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (ownerOrgId) q = q.eq('owner_org_id', ownerOrgId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        sortOrder: Number(r.sort_order ?? 0),
      }));
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['catalog'] });
}

export function useSaveProductGroup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, name, ownerOrgId }: { id?: string; name: string; ownerOrgId?: string }) => {
      const { error } = await supabase.rpc('save_product_group', rpcArgs({
        p_id: id ?? undefined,
        p_name: name,
        p_sort_order: 0,
        p_owner_org_id: ownerOrgId ?? undefined,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Grup silinince ürünler SİLİNMEZ, gruptan çıkarılır — grup bir etikettir. */
export function useDeleteProductGroup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ownerOrgId }: { id: string; ownerOrgId?: string }) => {
      const { error } = await supabase.rpc('delete_product_group', rpcArgs({
        p_id: id,
        p_owner_org_id: ownerOrgId ?? undefined,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
