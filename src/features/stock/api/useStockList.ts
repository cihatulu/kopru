import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

export interface StockRow {
  productId: string;
  name: string;
  code: string;
  /** Stok kaydı hiç yoksa null — "0 adet" ile aynı şey DEĞİL. */
  quantity: number | null;
  unit: string;
  updatedAt: string | null;
}

// Açık kolon listeleri (kilitli kural 19). Gizli fiyat katmanları burada yok (A4).
const PRODUCT_COLUMNS = 'id, name, code';
const STOCK_COLUMNS = 'product_id, quantity, unit, updated_at';

/**
 * Stok listesi: aktif ürünler + varsa stok kaydı.
 *
 * İki sorgu, tek gömme değil. Sebep: gömme yapıldığında stok kaydı OLMAYAN
 * ürünler de dönmeli (dış birleşim) ama asıl mesele şu — "kaydı yok" ile
 * "sıfır adet" farklı durumlar. Tek sorguda ikisi de `null` gelir ve ayrım
 * kaybolur; burada `quantity: null` olarak korunuyor.
 */
export function useStockList(search: string) {
  return useQuery({
    queryKey: ['stock', 'list', search],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<StockRow[]> => {
      let q = supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(500);

      const term = search.trim();
      if (term) q = q.or(`name.ilike.%${term}%,code.ilike.%${term}%`);

      const { data: products, error } = await q;
      if (error) throw error;

      const rows = products ?? [];
      if (rows.length === 0) return [];

      const { data: stocks, error: stockError } = await supabase
        .from('manufacturer_stock')
        .select(STOCK_COLUMNS)
        .in(
          'product_id',
          rows.map((p) => String(p.id)),
        );
      if (stockError) throw stockError;

      const byProduct = new Map(
        (stocks ?? []).map((s) => [
          String(s.product_id),
          {
            quantity: Number(s.quantity),
            unit: String(s.unit ?? 'adet'),
            updatedAt: (s.updated_at as string | null) ?? null,
          },
        ]),
      );

      return rows.map((p) => {
        const s = byProduct.get(String(p.id));
        return {
          productId: String(p.id),
          name: String(p.name),
          code: String(p.code ?? ''),
          quantity: s ? s.quantity : null,
          unit: s?.unit ?? 'adet',
          updatedAt: s?.updatedAt ?? null,
        };
      });
    },
  });
}
