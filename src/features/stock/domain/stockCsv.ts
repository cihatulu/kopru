import type { StockCsvRow } from './csv';
import type { StockRow } from '../api/useStockList';

/**
 * Üretici stok listesini şablon satırlarına çevirir — SAF (A20).
 *
 * Dosya üretimi burada YAPILMAZ; yalnız satırlar hazırlanır. Böylece aynı
 * satırlar hem xlsx hem csv üreticisine verilebilir.
 *
 * Grup adı kimlikten çözülür: dosyayı açan kişi uuid değil, insan okuyabilir
 * bir grup adı görmeli.
 */
export function toStockRows(
  rows: readonly StockRow[],
  groups: readonly { id: string; name: string }[],
): StockCsvRow[] {
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  return rows.map((r) => ({
    productId: r.productId,
    productName: r.name,
    productCode: r.code,
    category: r.category,
    groupName: r.groupId ? (groupName.get(r.groupId) ?? null) : null,
    // Stok kaydı hiç yoksa şablonda 0 gösterilir — kullanıcı üzerine yazsın.
    quantity: r.quantity ?? 0,
  }));
}
