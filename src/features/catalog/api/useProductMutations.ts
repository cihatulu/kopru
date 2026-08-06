import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface SaveProductInput {
  id?: string | undefined;
  name: string;
  code: string;
  supplierPrice: number;
  /** undefined = maliyet bilinmiyor; kayıt silinir. 0 ile aynı şey DEĞİLDİR. */
  costPrice?: number | undefined;
  description?: string | undefined;
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['catalog'] });
}

/**
 * Ürünü kaydeder. İki fiyat katmanı iki ayrı tabloya gider (A4), bu yüzden
 * yazma tek RPC içinde atomiktir — yarım kayıt oluşmaz.
 */
export function useSaveProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: SaveProductInput) => {
      const { data, error } = await supabase.rpc('save_product', {
        p_id: input.id ?? null,
        p_name: input.name,
        p_code: input.code,
        p_supplier_price: input.supplierPrice,
        p_cost_price: input.costPrice ?? null,
        p_group_id: null,
        p_description: input.description ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useSetProductActive() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      // Soft delete (kilitli kural 16); gerçek DELETE yok.
      const { error } = await supabase.rpc('set_product_active', {
        p_id: id,
        p_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
