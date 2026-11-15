/** Ham PostgREST JSON'unu güvenli okuma yardımcıları — SAF (A20). */
export type Row = Record<string, unknown>;

export const str = (v: unknown): string => (typeof v === 'string' ? v : '');
export const num = (v: unknown): number => Number(v ?? 0);
export const nullable = (v: unknown): string | null => (typeof v === 'string' ? v : null);
export const nested = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});
export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Gömülü tek kaydı okur.
 *
 * PostgREST bire-bir gömmeyi kimi yerde tek elemanlı DİZİ, kimi yerde doğrudan
 * NESNE döndürür (ilişkiyi tekil algıladığında). Yalnız diziyi karşılamak,
 * `order_item_retail_prices` nesne geldiğinde kaydı görünmez yapıyordu: sipariş
 * listesi ve detayı sipariş anındaki fiyat yerine ürünün GÜNCEL perakende
 * fiyatına düşüyor, özel talep farkı da böylece ekranda kayboluyordu.
 */
export function firstOf(v: unknown): Row | undefined {
  if (Array.isArray(v)) {
    const arr = v as unknown[];
    return arr.length > 0 ? nested(arr[0]) : undefined;
  }
  return v && typeof v === 'object' ? (v as Row) : undefined;
}
