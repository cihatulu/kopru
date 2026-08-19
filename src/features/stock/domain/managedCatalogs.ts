/** `useRetailerStockList`'in ilişki sorgusundan dönen ham satır. */
export interface CatalogEdge {
  manufacturerOrgId: string;
  canEditCatalog: boolean;
  manufacturerIsSubscriber: boolean;
}

/**
 * Kataloğunu perakendecinin YÖNETTİĞİ üreticilerin kimlikleri.
 *
 * İki koşul birlikte aranır ve ikincisi kolay unutuluyor:
 *   1. ilişkide `can_edit_catalog` açık,
 *   2. üretici MİSAFİR.
 *
 * `can_edit_catalog` üye üreticide anlamsızdır — üye kendi kataloğunun
 * sahibidir, anahtar açık olsa bile. Abonelik koşulu düştüğünde üye
 * üreticinin PASİF ürünleri perakendecinin stok listesine sızdı; kullanıcı
 * daha aktive etmediği ürünleri karşı tarafta gördü.
 *
 * Aynı kural sunucuda `save_product` ve `delete_product_permanently` içinde,
 * istemcide `catalogEditableSuppliers`'da var. Üçü ayrışırsa ekran ile
 * sunucu birbirini tutmaz; bu yüzden burada saf ve test edilir tutulur.
 */
export function managedManufacturerIds(edges: readonly CatalogEdge[]): Set<string> {
  const ids = new Set<string>();
  for (const e of edges) {
    if (!e.canEditCatalog && !e.manufacturerIsSubscriber) ids.add(e.manufacturerOrgId);
  }
  return ids;
}
