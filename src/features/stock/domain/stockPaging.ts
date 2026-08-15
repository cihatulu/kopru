/**
 * Stok listesinin istemci tarafı kategori süzme + sayfalama mantığı.
 *
 * SAF — react/supabase/DOM yok (A20). Buradaki sayfalama yalnız EKRANDAKİ
 * diziyi böler; sunucu sorgusu keyset ile gelir (kilitli kural 19). Yani bu
 * dosya `OFFSET` değil, elde duran diziyi dilimler.
 */

export interface CategoryRow {
  category: string | null;
}

/** Listede geçen kategorileri tekrarsız ve boşları atarak döner. */
export function uniqueCategories(rows: readonly CategoryRow[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.category) seen.add(r.category);
  }
  return [...seen];
}

/** `category` null ise süzme yapılmaz — "Tümü" durumu. */
export function filterByCategory<T extends CategoryRow>(
  rows: readonly T[],
  category: string | null,
): T[] {
  if (!category) return [...rows];
  return rows.filter((r) => r.category === category);
}

/** Boş listede 0 döner; çağıran "sayfalama gösterme" kararını buna bakarak verir. */
export function pageCount(total: number, perPage: number): number {
  if (perPage <= 0 || total <= 0) return 0;
  return Math.ceil(total / perPage);
}

/**
 * Sayfa numarasını geçerli aralığa çeker.
 *
 * NEDEN: kullanıcı 3. sayfadayken arama sonucu tek sayfaya inerse, sayfa
 * numarası 3'te kalır ve tablo BOŞ görünürdü — veri kaybı sanılan bu durum
 * furniture-platform'da defalarca "ürünlerim gitti" olarak bildirilmişti.
 */
export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  return Math.min(Math.max(1, page), totalPages);
}

/** Sayfa 1 tabanlıdır. Aralık dışı sayfa boş dizi döndürmez — kırpılır. */
export function pageSlice<T>(rows: readonly T[], page: number, perPage: number): T[] {
  const safePage = clampPage(page, pageCount(rows.length, perPage));
  const start = (safePage - 1) * perPage;
  return rows.slice(start, start + perPage);
}
