import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME, ORG_KIND } from '@/constants';
import { useAuthSession } from '@/features/auth';
import type { Dimensions, SetLine, Variant } from '../domain/variants';

// Açık kolon listesi (kilitli kural 19). Maliyet burada YOKTUR ve olamaz —
// üreticinin maliyeti ayrı `product_costs` tablosunda (A4).
const PRODUCT_COLUMNS =
  'id, name, code, description, supplier_price, currency, is_active, owner_org_id, ' +
  'images, type, variants, set_contents, width_cm, depth_cm, height_cm, group_id, category, ' +
  'created_at, price_review_needed';

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
  type: 'single' | 'set';
  variants: Variant[];
  setContents: SetLine[];
  dimensions: Dimensions;
  groupId: string | null;
  /** Grup › Kategori › Model hiyerarşisinin orta kademesi. */
  category: string | null;
  createdAt: string;
  /**
   * Üyeliğe geçerken mükerrer ürünler birleştirildi ve gruptaki satış
   * fiyatları farklıydı. En eskisininki tutuldu; üretici kontrol etmeli.
   */
  priceReviewNeeded: boolean;
}

// jsonb kolonların içeriği tip sisteminden geçmez; alan alan ayrıştırılır ki
// bozuk bir kayıt tüm listeyi çökertmesin.
function parseVariants(value: unknown): Variant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    const o = v as Record<string, unknown>;
    if (typeof o?.name !== 'string' || !Array.isArray(o.options)) return [];
    return [{ name: o.name, options: o.options.filter((x): x is string => typeof x === 'string') }];
  });
}

function parseSetContents(value: unknown): SetLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    const o = v as Record<string, unknown>;
    if (typeof o?.product_id !== 'string') return [];
    return [{ productId: o.product_id, quantity: Number(o.quantity ?? 1) }];
  });
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
    type: r.type === 'set' ? 'set' : 'single',
    variants: parseVariants(r.variants),
    setContents: parseSetContents(r.set_contents),
    dimensions: {
      width: r.width_cm == null ? undefined : Number(r.width_cm),
      depth: r.depth_cm == null ? undefined : Number(r.depth_cm),
      height: r.height_cm == null ? undefined : Number(r.height_cm),
    },
    groupId: typeof r.group_id === 'string' ? r.group_id : null,
    category: typeof r.category === 'string' ? r.category : null,
    createdAt: r.created_at as string,
    priceReviewNeeded: r.price_review_needed === true,
  };
}

interface Options {
  /** Belirli bir üreticinin kataloğu (perakendeci görünümü). Boşsa RLS kapsamı. */
  ownerOrgId?: string;
  /** Birden fazla tedarikçinin kataloğu (perakendeci tüm üreticiler görünümü). */
  ownerOrgIds?: string[];
  search?: string;
  activeOnly?: boolean;
}

/** Ürün listesi — keyset sayfalama (A17). */
export function useProducts(opts: Options = {}) {
  const { data: session } = useAuthSession();
  const org = session?.org;
  const isSubscriber = org?.isSubscriber ?? true;
  const activeSponsorId = session?.sponsorOrgId || org?.createdByOrgId;
  const kind = org?.kind;

  // Misafir perakendeci YALNIZCA oturum açtığı sponsor üreticinin ürünlerini görebilir.
  const targetOwnerOrgId =
    !isSubscriber && activeSponsorId && kind === ORG_KIND.retailer
      ? activeSponsorId
      : opts.ownerOrgId;

  return useInfiniteQuery({
    queryKey: ['catalog', 'products', targetOwnerOrgId, opts.ownerOrgIds, opts.search, opts.activeOnly],
    staleTime: STALE_TIME.catalog,
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    enabled: !(opts.ownerOrgIds && opts.ownerOrgIds.length === 0),
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      if (targetOwnerOrgId) {
        q = q.eq('owner_org_id', targetOwnerOrgId);
      } else if (opts.ownerOrgIds && opts.ownerOrgIds.length > 0) {
        q = q.in('owner_org_id', opts.ownerOrgIds);
      }
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
