import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import { managedManufacturerIds, type CatalogEdge } from '../domain/managedCatalogs';

export interface RetailerStockRow {
  productId: string;
  name: string;
  code: string;
  manufacturerName: string;
  /** Stok kaydı hiç yoksa null — "0 adet" ile aynı şey DEĞİL. */
  quantity: number | null;
  unit: string;
  updatedAt: string | null;
  category: string | null;
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  /** Pasif ürün yalnız kataloğunu perakendecinin yönettiği üreticide görünür. */
  isActive: boolean;
  /** Silme için gerekli: ürün perakendecinin değil, üreticinin kaydıdır. */
  ownerOrgId: string;
  /** İlişkide `can_edit_catalog` açık — perakendeci bu kataloğu yönetir. */
  managed: boolean;
}

// Açık kolon listeleri (kilitli kural 19). Gizli fiyat katmanları YOK (A4):
// bu ekran adet yönetir, fiyat göstermez.
const PRODUCT_COLUMNS =
  'id, name, code, category, width_cm, depth_cm, height_cm, owner_org_id, is_active';
const STOCK_COLUMNS = 'product_id, quantity, unit, updated_at';

/**
 * Perakendecinin stok listesi: tedarikçilerinin ürünleri + kendi depo adedi.
 *
 * ÜRETİCİ ADI ürünle birlikte gömülmez. Sebep: `products.owner_org_id`
 * organizations'a bileşik anahtarla (`id, kind`) bağlı ve PostgREST bileşik
 * kısıtı tek kolonluk ipuçtan çözemez (bkz. ERROR_PROTOCOLS §21). Üretici
 * adları ilişki listesinden ayrıca okunup eşlenir.
 *
 * İki sorgu, tek gömme değil: stok kaydı OLMAYAN ürün de listelenmeli ve
 * "kaydı yok" ile "sıfır adet" ayrımı korunmalı.
 */
export function useRetailerStockList(search: string) {
  return useQuery({
    queryKey: ['stock', 'retailer-list', search],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<RetailerStockRow[]> => {
      const { data: edges, error: edgeError } = await supabase
        .from('relationships')
        .select('manufacturer_org_id, can_edit_catalog, manufacturer:organizations!relationships_manufacturer_org_id_manufacturer_kind_fkey(company_name, is_subscriber)')
        .eq('status', 'active');
      if (edgeError) throw edgeError;

      const nameByOrg = new Map<string, string>();
      const catalogEdges: CatalogEdge[] = [];
      for (const e of edges ?? []) {
        const org = e.manufacturer as {
          company_name?: string | null;
          is_subscriber?: boolean | null;
        } | null;
        const id = String(e.manufacturer_org_id);
        nameByOrg.set(id, org?.company_name ?? '—');
        catalogEdges.push({
          manufacturerOrgId: id,
          canEditCatalog: e.can_edit_catalog === true,
          manufacturerIsSubscriber: org?.is_subscriber !== false,
        });
      }
      // Kataloğunu perakendecinin yönettiği üreticiler — kural domain'de.
      const managedOrgs = managedManufacturerIds(catalogEdges);
      if (nameByOrg.size === 0) return [];

      let q = supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .in('owner_org_id', [...nameByOrg.keys()])
        .order('name', { ascending: true })
        .limit(500);

      /*
        PASİF ÜRÜN PERAKENDECİYE GÖSTERİLMEZ.

        Üretici stok dosyası yüklediğinde tanınmayan satırlar pasif ürün
        oluşturur; bunlar üreticinin kendi ekranında görünür ama karşı tarafa
        AÇILMAZ — perakendecinin stoğunda ve kataloğunda ancak üretici ürünü
        AKTİVE ettiğinde belirir.

        İstisna: kataloğunu perakendecinin yönettiği misafir üretici. Orada
        pasif ürünü oluşturan da aktive edecek olan da perakendecidir;
        süzülseydi kendi yüklediği stoğu göremezdi.

        Süzgeç sunucuda: istemcide süzmek pasif satırların 500'lük limiti
        yemesine ve listenin sessizce eksilmesine yol açardı.
      */
      q = managedOrgs.size
        ? q.or(`is_active.eq.true,owner_org_id.in.(${[...managedOrgs].join(',')})`)
        : q.eq('is_active', true);

      const term = search.trim();
      if (term) q = q.or(`name.ilike.%${term}%,code.ilike.%${term}%`);

      const { data: products, error } = await q;
      if (error) throw error;

      const rows = products ?? [];
      if (rows.length === 0) return [];

      const { data: stocks, error: stockError } = await supabase
        .from('retailer_stock')
        .select(STOCK_COLUMNS)
        .in('product_id', rows.map((p) => String(p.id)));
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
          manufacturerName: nameByOrg.get(String(p.owner_org_id)) ?? '—',
          quantity: s ? s.quantity : null,
          unit: s?.unit ?? 'adet',
          updatedAt: s?.updatedAt ?? null,
          category: p.category ?? null,
          widthCm: p.width_cm != null ? Number(p.width_cm) : null,
          depthCm: p.depth_cm != null ? Number(p.depth_cm) : null,
          heightCm: p.height_cm != null ? Number(p.height_cm) : null,
          isActive: p.is_active !== false,
          ownerOrgId: String(p.owner_org_id),
          managed: managedOrgs.has(String(p.owner_org_id)),
        };
      });
    },
  });
}
