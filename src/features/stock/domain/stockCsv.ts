import { toCsv } from './csv';
import type { StockRow } from '../api/useStockList';

/**
 * Üretici stok listesini şablon CSV'sine çevirir.
 *
 * SAF — dosya indirme burada YAPILMAZ, yalnız metin üretilir (A20). Grup adı
 * kimlikten çözülür; dosyayı Excel'de açan kişi uuid değil, insan okuyabilir
 * bir grup adı görmeli.
 */
export function toStockCsv(
  rows: readonly StockRow[],
  groups: readonly { id: string; name: string }[],
): string {
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  return toCsv(
    rows.map((r) => ({
      productId: r.productId,
      productName: r.name,
      productCode: r.code,
      category: r.category,
      groupName: r.groupId ? (groupName.get(r.groupId) ?? null) : null,
      // Stok kaydı hiç yoksa şablonda 0 gösterilir — kullanıcı üzerine yazsın.
      quantity: r.quantity ?? 0,
    })),
  );
}
