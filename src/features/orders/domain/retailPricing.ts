/** Perakende fiyat ve iade tutarı hesabı — SAF (A20, A4). */
import { firstOf, nested, num, round2, str, type Row } from './rowHelpers';

/**
 * Kalemin HER ŞEY DAHİL perakende birim fiyatı (taban + özel talep farkı).
 *
 * İki kaynak farklı şey tutar ve karıştırılmamalıdır:
 *   · `order_item_retail_prices.retail_unit_price` — sipariş anında donmuş,
 *     fark ZATEN İÇİNDE.
 *   · `products.retail_prices.retail_price` — ürünün güncel liste fiyatı, fark
 *     İÇERMEZ; kayıt yoksa buna düşülür ve fark elle eklenir.
 *
 * Hiçbiri yoksa undefined — çağıran üretici fiyatını kullanır.
 */
export function retailAllIn(item: Row, diff: number): number | undefined {
  const recorded = firstOf(item.order_item_retail_prices);
  if (recorded) {
    const price = num(recorded.retail_unit_price);
    if (price > 0) return price;
  }

  const current = firstOf(nested(item.products).retail_prices);
  if (current) {
    const price = num(current.retail_price);
    if (price > 0) return round2(price + diff);
  }

  return undefined;
}

export function getReturnedTotal(r: Row, iAmManufacturer: boolean): number {
  const returns = Array.isArray(r.return_requests) ? r.return_requests : [];
  let total = 0;
  for (const retRaw of returns) {
    const ret = nested(retRaw);
    if (ret.status !== 'approved') continue;
    if (iAmManufacturer) {
      total += num(ret.approved_amount);
    } else {
      // Perakendeci için perakende fiyatları üzerinden iade toplamı hesapla
      const retItems = Array.isArray(ret.items) ? ret.items : [];
      const orderItems = Array.isArray(r.order_items) ? (r.order_items as unknown[]) : [];
      for (const retItemRaw of retItems) {
        const retItem = nested(retItemRaw);
        const retItemId = str(retItem.order_item_id);
        const orderItemRaw = orderItems.find(oi => str(nested(oi).id) === retItemId);
        if (orderItemRaw) {
          const orderItem = nested(orderItemRaw);
          const diff = num(orderItem.price_difference);
          const price = retailAllIn(orderItem, diff);
          const unitPrice = price !== undefined && price > 0 ? price : (num(orderItem.supplier_unit_price) + diff);
          total += unitPrice * num(retItem.quantity);
        }
      }
    }
  }
  return round2(total);
}
