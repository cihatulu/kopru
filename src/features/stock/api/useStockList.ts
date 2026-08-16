import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

export interface StockVariant {
  name: string;
  options: string[];
}

/** `variants` JSONB'dir; şekli DB tarafından garanti edilmez, okurken daraltılır. */
function toVariants(raw: unknown): StockVariant[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    return {
      name: typeof o.name === 'string' ? o.name : '',
      options: Array.isArray(o.options) ? o.options.map((x) => String(x)) : [],
    };
  });
}

export interface StockRow {
  productId: string;
  name: string;
  code: string;
  /** Stok kaydı hiç yoksa null — "0 adet" ile aynı şey DEĞİL. */
  quantity: number | null;
  unit: string;
  updatedAt: string | null;
  category: string | null;
  groupId: string | null;
  images: string[];
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  variants: StockVariant[];
  /** Pasif ürün katalogda görünmez ama stoğu olabilir. */
  isActive: boolean;
}

// Açık kolon listeleri (kilitli kural 19). Gizli fiyat katmanları burada yok (A4).
const PRODUCT_COLUMNS =
  'id, name, code, category, group_id, images, width_cm, depth_cm, height_cm, variants, is_active';
const STOCK_COLUMNS = 'product_id, quantity, unit, updated_at';

/**
 * Stok listesi: TÜM ürünler + varsa stok kaydı.
 *
 * PASİF ÜRÜNLER DE LİSTELENİR. Stok Yönetimi katalog değildir: Excel'den
 * gelen tanınmayan satır stok kaydı oluşturur ama ürünü pasif bırakır —
 * "stoğu olup katalogda görünmeyen ürün" olağandır. Liste `is_active` süzseydi
 * kullanıcı yüklediği stoğu hiçbir yerde göremezdi (gerçekten yaşandı).
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
          category: p.category ?? null,
          groupId: p.group_id ?? null,
          images: Array.isArray(p.images) ? p.images : [],
          widthCm: p.width_cm != null ? Number(p.width_cm) : null,
          depthCm: p.depth_cm != null ? Number(p.depth_cm) : null,
          heightCm: p.height_cm != null ? Number(p.height_cm) : null,
          variants: toVariants(p.variants),
          isActive: p.is_active !== false,
        };
      });
    },
  });
}
