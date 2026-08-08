import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

/** Ağaçta bir yaprak — kart listesinin ihtiyaç duyduğundan çok daha azı. */
export interface TreeProduct {
  id: string;
  name: string;
  code: string;
}

export interface TreeGroup {
  id: string | null;
  name: string;
  products: TreeProduct[];
}

// Açık kolon listeleri (kilitli kural 19). Fiyat ve maliyet ağaçta YOK —
// menüde görünmesi gerekmeyen veriyi çekmek gereksiz sızma yüzeyidir (A4).
const GROUP_COLUMNS = 'id, name, sort_order';
const PRODUCT_COLUMNS = 'id, name, code, group_id';

/** Grubu olmayan ürünlerin toplandığı sanal düğüm. */
const UNGROUPED_LABEL = 'Diğer ürünler';

/**
 * Sol menüdeki grup → ürün ağacı.
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

      const byGroup = new Map<string, TreeProduct[]>();
      const ungrouped: TreeProduct[] = [];

      for (const p of productRows ?? []) {
        const leaf: TreeProduct = {
          id: String(p.id),
          name: String(p.name),
          code: String(p.code ?? ''),
        };
        const gid = typeof p.group_id === 'string' ? p.group_id : null;
        if (gid === null) {
          ungrouped.push(leaf);
          continue;
        }
        const list = byGroup.get(gid) ?? [];
        list.push(leaf);
        byGroup.set(gid, list);
      }

      const groups: TreeGroup[] = (groupRows ?? []).map((g) => ({
        id: String(g.id),
        name: String(g.name),
        products: byGroup.get(String(g.id)) ?? [],
      }));

      // Gruplanmamışlar EN SONA konur; grupların arasına karışırsa kullanıcı
      // onu gerçek bir grup sanar ve düzenlemeye çalışır.
      if (ungrouped.length > 0) {
        groups.push({ id: null, name: UNGROUPED_LABEL, products: ungrouped });
      }
      return groups;
    },
  });
}
