/** Ürün Yönetimi ekranının hesapları — SAF (A20). */

/** Bu adedin altındaki stok "kritik" sayılır. */
export const CRITICAL_STOCK = 10;

export type MarginBand = 'high' | 'mid' | 'low' | 'unknown';

export const MARGIN_LABEL: Record<MarginBand, string> = {
  high: 'Yüksek',
  mid: 'Orta',
  low: 'Düşük',
  unknown: 'Hesaplanamıyor',
};

export function netProfit(price: number, cost: number | undefined): number | null {
  if (cost === undefined) return null;
  return price - cost;
}

export function marginBand(margin: number | null): MarginBand {
  if (margin === null) return 'unknown';
  if (margin >= 30) return 'high';
  if (margin >= 15) return 'mid';
  return 'low';
}

export type StockLevel = 'out' | 'low' | 'ok' | 'unknown';

/** Stok kaydı hiç yoksa 'unknown' — "0 adet" ile aynı şey değildir. */
export function stockLevel(quantity: number | null): StockLevel {
  if (quantity === null) return 'unknown';
  if (quantity === 0) return 'out';
  if (quantity < CRITICAL_STOCK) return 'low';
  return 'ok';
}

export interface StatInput {
  price: number;
  quantity: number | null;
}

export interface ProductStats {
  total: number;
  criticalStock: number;
  stockValue: number;
  activeForSale: number;
}

/**
 * Üst şeritteki dört sayı.
 *
 * Stok kaydı olmayan ürün "kritik" SAYILMAZ: kritik stok, azalmış bir stoğun
 * uyarısıdır; hiç sayım girilmemiş ürün için uyarı vermek her yeni üründe
 * yanlış alarm demek olurdu.
 */
export function computeStats(items: StatInput[]): ProductStats {
  let criticalStock = 0;
  let stockValue = 0;
  let activeForSale = 0;

  for (const item of items) {
    const q = item.quantity;
    if (q === null) continue;
    if (q < CRITICAL_STOCK) criticalStock += 1;
    if (q > 0) activeForSale += 1;
    stockValue += item.price * q;
  }

  return { total: items.length, criticalStock, stockValue, activeForSale };
}

/**
 * KPI kartındaki kısa para biçimi: 460000 → "₺460K".
 *
 * Kartta tam tutar yazılsaydı ("₺460.000,00") rakam kutuya sığmaz, milyonlu
 * değerlerde taşardı. Tam tutar tabloda zaten var.
 */
export function compactMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₺${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₺${Math.round(value / 1_000)}K`;
  return `₺${value.toFixed(0)}`;
}

export type StockFilter = 'all' | 'high' | 'low';

/** Stok durumu filtresi. 'high' = kritik eşiğin üstü. */
export function matchesStockFilter(quantity: number | null, filter: StockFilter): boolean {
  if (filter === 'all') return true;
  if (quantity === null) return false;
  return filter === 'low' ? quantity < CRITICAL_STOCK : quantity >= CRITICAL_STOCK;
}
