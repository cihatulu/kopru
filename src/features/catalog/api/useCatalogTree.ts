import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

/** Ağaçta bir yaprak — kart listesinin ihtiyaç duyduğundan çok daha azı. */
export interface TreeProduct {
  id: string;
  name: string;
  code: string;
}

/** Grubun altındaki kırılım. */
export interface TreeCategory {
  /** null = bu grupta kategorisi girilmemiş ürünler. */
  name: string | null;
  products: TreeProduct[];
}

export interface TreeGroup {
  id: string | null;
  name: string;
  categories: TreeCategory[];
}

// Açık kolon listeleri (kilitli kural 19). Fiyat ve maliyet ağaçta YOK —
// menüde görünmesi gerekmeyen veriyi çekmek gereksiz sızma yüzeyidir (A4).
const GROUP_COLUMNS = 'id, name, sort_order';
const PRODUCT_COLUMNS = 'id, name, code, group_id, category';

/** Grubu olmayan ürünlerin toplandığı sanal düğüm. */
const UNGROUPED_LABEL = 'Diğer ürünler';

/** Bir grupta kategorisi girilmemiş ürünlerin toplandığı sanal düğüm. */
const UNCATEGORIZED_LABEL = 'Kategorisiz';

interface Row {
  id: string;
  name: string;
  code: string | null;
  group_id: string | null;
  category: string | null;
}

/** Ürünleri kategoriye göre böler; kategorisizler EN SONA konur. */
function toCategories(rows: Row[]): TreeCategory[] {
  const byCategory = new Map<string, TreeProduct[]>();
  const uncategorized: TreeProduct[] = [];

  for (const r of rows) {
    const leaf: TreeProduct = { id: r.id, name: r.name, code: r.code ?? '' };
    if (!r.category) {
      uncategorized.push(leaf);
      continue;
    }
    const list = byCategory.get(r.category) ?? [];
    list.push(leaf);
    byCategory.set(r.category, list);
  }

  const out: TreeCategory[] = [...byCategory.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'tr'))
    .map(([name, products]) => ({ name, products }));

  if (uncategorized.length > 0) out.push({ name: null, products: uncategorized });
  return out;
}

export const TREE_LABELS = {
  ungrouped: UNGROUPED_LABEL,
  uncategorized: UNCATEGORIZED_LABEL,
} as const;

/**
 * Sol menüdeki GRUP → KATEGORİ → ÜRÜN ağacı.
 *
 * Üç kademe, kullanıcının kafasındaki kırılımla aynı: grup en üstte, kategori
 * onun altında, model (ürün kodu) en altta.
 *
 * Sayfalı ürün listesinden AYRI bir sorgu: menü tamamını bir kerede göstermek
 * zorunda, "daha fazla yükle" diye bir şeyi yok. Bu yüzden dar bir kolon
 * kümesi ve sert bir üst sınırla çekilir — katalog büyüdüğünde menü değil
 * katalog SAYFASI sayfalanır.
 */
export function useCatalogTree(ownerOrgId: string | undefined) {
  return useQuery({
    queryKey: ['catalog', 'tree', ownerOrgId],
    enabled: !!ownerOrgId,
    staleTime: STALE_TIME.catalog,
    queryFn: async (): Promise<TreeGroup[]> => {
      const { data: groupRows, error: groupError } = await supabase
        .from('product_groups')
        .select(GROUP_COLUMNS)
        .eq('owner_org_id', ownerOrgId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (groupError) throw groupError;

      const { data: productRows, error: productError } = await supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .eq('owner_org_id', ownerOrgId!)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(1000);
      if (productError) throw productError;

      const rows = (productRows ?? []) as Row[];
      const byGroup = new Map<string, Row[]>();
      const ungrouped: Row[] = [];

      for (const r of rows) {
        if (r.group_id === null) {
          ungrouped.push(r);
          continue;
        }
        const list = byGroup.get(r.group_id) ?? [];
        list.push(r);
        byGroup.set(r.group_id, list);
      }

      const groups: TreeGroup[] = (groupRows ?? []).map((g) => ({
        id: String(g.id),
        name: String(g.name),
        categories: toCategories(byGroup.get(String(g.id)) ?? []),
      }));

      // Gruplanmamışlar EN SONA konur; grupların arasına karışırsa kullanıcı
      // onu gerçek bir grup sanar ve düzenlemeye çalışır.
      if (ungrouped.length > 0) {
        groups.push({ id: null, name: UNGROUPED_LABEL, categories: toCategories(ungrouped) });
      }
      return groups;
    },
  });
}
