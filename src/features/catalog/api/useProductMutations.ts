import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SetLine, Variant } from '../domain/variants';

export interface SaveProductInput {
  id?: string | undefined;
  name: string;
  code: string;
  supplierPrice: number;
  /** undefined = maliyet bilinmiyor; kayıt silinir. 0 ile aynı şey DEĞİLDİR. */
  costPrice?: number | undefined;
  description?: string | undefined;
  /** Storage'a önceden yüklenmiş görsellerin public URL'leri. */
  images?: string[] | undefined;
  groupId?: string | null | undefined;
  category?: string | undefined;
  type?: 'single' | 'set' | undefined;
  variants?: Variant[] | undefined;
  setContents?: SetLine[] | undefined;
  width?: number | undefined;
  depth?: number | undefined;
  height?: number | undefined;
  /** undefined = stok değişmesin. 0 geçerli bir değerdir. */
  stock?: number | undefined;
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['catalog'] });
}

/**
 * Ürünü kaydeder. Üç fiyat katmanı ve stok ayrı tablolarda (A4) olduğu için
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
        p_group_id: input.groupId ?? null,
        p_description: input.description ?? null,
        p_images: input.images ?? null,
        p_type: input.type ?? 'single',
        p_variants: input.variants ?? [],
        p_set_contents:
          input.setContents?.map((s) => ({ product_id: s.productId, quantity: s.quantity })) ?? [],
        p_width: input.width ?? null,
        p_depth: input.depth ?? null,
        p_height: input.height ?? null,
        p_stock: input.stock ?? null,
        p_category: input.category ?? null,
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

/**
 * Ürünü KALICI olarak siler.
 *
 * Yalnız PASİF ürün silinebilir ve yalnız org sahibi çağırabilir — sunucu
 * ikisini de yeniden doğrular. Sipariş geçmişi bozulmaz: eski sipariş satırı
 * kendi anlık görüntüsüyle (product_snapshot) durur, yalnız canlı ürün
 * bağlantısını kaybeder.
 */
export function useDeleteProductPermanently() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_product_permanently', { p_id: id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
