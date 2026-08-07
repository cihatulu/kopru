/**
 * Rapor metrikleri — SAF (A20).
 *
 * Marj ve kâr hesapları burada; hangi sayının kime gösterileceği ise sunucudaki
 * ayrı RPC'lerle belirlenir (A4). Bu katman yalnız aritmetik yapar.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Üreticinin brüt kârı ve marjı. Maliyet bilinmiyorsa marj yanıltıcı olur. */
export function manufacturerMargin(revenue: number, cost: number): {
  profit: number;
  percent: number | null;
} {
  const profit = round2(revenue - cost);
  // Maliyet hiç girilmemişse (0) marj %100 görünürdü — bu yanlış bilgidir.
  if (revenue <= 0 || cost <= 0) return { profit, percent: null };
  return { profit, percent: round1((profit / revenue) * 100) };
}

/** Perakendecinin beklenen kârı. Satış fiyatı girilmemişse hesaplanamaz. */
export function retailerProfit(purchaseTotal: number, expectedRevenue: number): {
  profit: number;
  percent: number | null;
} {
  if (expectedRevenue <= 0) return { profit: 0, percent: null };
  const profit = round2(expectedRevenue - purchaseTotal);
  return { profit, percent: round1((profit / expectedRevenue) * 100) };
}

/** Ortalama sipariş tutarı. */
export function averageOrder(total: number, count: number): number {
  return count > 0 ? round2(total / count) : 0;
}
