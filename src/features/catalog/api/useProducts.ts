import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';

// Açık kolon listesi (kilitli kural 19). Maliyet burada YOKTUR ve olamaz —
// üreticinin maliyeti ayrı `product_costs` tablosunda (A4).
const PRODUCT_COLUMNS =
  'id, name, code, description, supplier_price, currency, is_active, owner_org_id, ' +
  'images, created_at';

export interface CatalogProduct {
  id: string;
  name: string;
  code: string;
  description: string | null;
  supplierPrice: number;
  currency: string;
  isActive: boolean;
  ownerOrgId: string;
  /** Public URL listesi; en fazla 3 (bkz. lib/storage). */
  images: string[];
  createdAt: string;
}

function toProduct(raw: unknown): CatalogProduct {
  const r = raw as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    code: r.code as string,
    description: (r.description as string | null) ?? null,
    supplierPrice: Number(r.supplier_price ?? 0),
    currency: (r.currency as string) ?? 'TRY',
    isActive: r.is_active as boolean,
    ownerOrgId: r.owner_org_id as string,
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    createdAt: r.created_at as string,
  };
}

interface Options {
  /** Belirli bir üreticinin kataloğu (perakendeci görünümü). Boşsa RLS kapsamı. */
  ownerOrgId?: string;
  search?: string;
  activeOnly?: boolean;
}

/** Ürün listesi — keyset sayfalama (A17). */
export function useProducts(opts: Options = {}) {
  return useInfiniteQuery({
    queryKey: ['catalog', 'products', opts],
    staleTime: STALE_TIME.catalog,
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      if (opts.ownerOrgId) q = q.eq('owner_org_id', opts.ownerOrgId);
      if (opts.activeOnly) q = q.eq('is_active', true);
      if (opts.search?.trim()) {
        const s = opts.search.trim();
        q = q.or(`name.ilike.%${s}%,code.ilike.%${s}%`);
      }
      if (pageParam) {
        q = q.or(
          `created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(toProduct);
    },
    getNextPageParam: (last) => {
      if (last.length < PAGE_SIZE) return undefined;
      const l = last[last.length - 1];
      return l ? { createdAt: l.createdAt, id: l.id } : undefined;
    },
  });
}

/**
 * Ürün maliyetleri (KATMAN 1) — ayrı tablodan, yalnız üretici tarafında anlamlı.
 * Perakendeci çağırırsa RLS 0 satır döndürür; sızıntı olmaz, liste boş gelir.
 */
export function useProductCosts(productIds: string[]) {
  return useQuery({
    queryKey: ['catalog', 'costs', [...productIds].sort()],
    enabled: productIds.length > 0,
    staleTime: STALE_TIME.catalog,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('product_costs')
        .select('product_id, cost_price')
        .in('product_id', productIds);
      if (error) throw error;

      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        map[row.product_id] = Number(row.cost_price);
      }
      return map;
    },
  });
}
