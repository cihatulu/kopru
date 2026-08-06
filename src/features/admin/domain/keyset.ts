/**
 * Keyset (cursor) sayfalama yardımcıları — SAF (A20).
 *
 * KİLİTLİ KURAL 19: `OFFSET` yasak. 55.000 organizasyon ve milyonlarca sipariş
 * satırında `OFFSET 10000` her sayfada baştan 10.000 satır tarar; keyset ise
 * `(created_at desc, id desc)` index'i üzerinde sabit maliyetlidir.
 */

export interface Cursor {
  createdAt: string;
  id: string;
}

/**
 * PostgREST `or` filtresi: (created_at, id) < (cursor.createdAt, cursor.id)
 *
 * Yalnız `created_at < cursor` yazmak YETMEZ — aynı milisaniyeye düşen satırlar
 * sayfa sınırında atlanır. Toplu içe aktarımda yüzlerce satır aynı damgayı
 * alabildiği için bu gerçek bir veri kaybı olurdu.
 */
export function keysetFilter(cursor: Cursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

/** Sayfanın son satırından bir sonraki imleci üretir; sayfa doluysa devam edilir. */
export function nextCursor<T extends Cursor>(rows: T[], pageSize: number): Cursor | undefined {
  if (rows.length < pageSize) return undefined;
  const last = rows[rows.length - 1];
  return last ? { createdAt: last.createdAt, id: last.id } : undefined;
}
