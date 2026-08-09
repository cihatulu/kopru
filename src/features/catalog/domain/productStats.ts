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

/** Liste hangi ürünleri gösteriyor. */
export type ActivityFilter = 'active' | 'passive';

export const ACTIVITY_LABEL: Record<ActivityFilter, string> = {
  active: 'Aktif ürünler',
  passive: 'Pasif ürünler',
};

/**
 * Aktiflik filtresi.
 *
 * Varsayılan 'active': üretici günlük işini aktif katalogla yapar. Pasifler
 * ayrı bir görünümde durur — karışık gösterilseydi satılmayan ürünler listeyi
 * doldurur ve "bu ürün neden siparişe düşmüyor" sorusunu doğururdu.
 */
export function matchesActivity(isActive: boolean, filter: ActivityFilter): boolean {
  return filter === 'active' ? isActive : !isActive;
}

export interface ListFilters {
  /** '' = tümü, 'yok' = gruplanmamış, aksi halde grup id'si. */
  group: string;
  /** '' = tümü, aksi halde kategori adı. */
  category: string;
  stock: StockFilter;
  activity: ActivityFilter;
}

export interface FilterableProduct {
  id: string;
  groupId: string | null;
  category: string | null;
  isActive: boolean;
}

/**
 * Liste filtrelerinin tamamı — SAF.
 *
 * Bileşende dağınık duran dört koşul burada toplandı: hem test edilebilir
 * oldu hem de "hangi filtre neyi eliyor" tek yerden okunuyor.
 */
export function filterProducts<T extends FilterableProduct>(
  products: T[],
  filters: ListFilters,
  stockOf: (id: string) => number | null,
): T[] {
  return products.filter((p) => {
    if (!matchesActivity(p.isActive, filters.activity)) return false;
    if (!matchesStockFilter(stockOf(p.id), filters.stock)) return false;
    if (filters.category !== '' && p.category !== filters.category) return false;
    if (filters.group === '') return true;
    if (filters.group === 'yok') return p.groupId === null;
    return p.groupId === filters.group;
  });
}

/** Ürünlerde geçen kategoriler — form önerisi ve filtre listesi için. */
export function collectCategories(products: { category: string | null }[]): string[] {
  const seen = new Set<string>();
  for (const p of products) if (p.category) seen.add(p.category);
  return [...seen].sort((a, b) => a.localeCompare(b, 'tr'));
}

/** Seçim kümesine ekle/çıkar — bileşende dört satır yer kaplıyordu. */
export function toggleInSet(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
