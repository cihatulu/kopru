/**
 * Takip sayfasının tutar ve sevkiyat hesapları — SAF (A20).
 * Fiyatlar perakende (KATMAN 3); bileşen yalnız sonucu gösterir.
 */
import {
  aggregate,
  isCustomerPayment,
  linesTotal,
  sourcesOf,
  type AggregatedLine,
  type TrackedItem,
  type TrackedOrder,
  type TrackedShipment,
} from './tracking';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Ham JSON'dan gelen, tipte tanımlı olmayan alanı okur (eski kayıtlar snake_case taşıyabilir). */
const field = (o: object, key: string): unknown => (o as Record<string, unknown>)[key];

const findOriginal = (original: AggregatedLine[], productId: string | null | undefined, name: string | undefined) =>
  original.find((o) => (productId && o.key.startsWith(productId)) || o.name === name);

export interface TrackSummary {
  original: AggregatedLine[];
  remaining: AggregatedLine[];
  originalTotal: number;
  activeTotal: number;
  totalReturnAmount: number;
  effectiveTotal: number;
  paid: number;
  balance: number;
  /** İlk hâl ile güncel hâl farklı mı? */
  changed: boolean;
}

export function trackSummary(order: TrackedOrder): TrackSummary {
  const sources = sourcesOf(order);
  const original = aggregate(sources, 'original');
  const remaining = aggregate(sources, 'remaining');
  const originalTotal = linesTotal(original);
  // İptal edilen sevkiyatları finansal hesaptan düş
  const activeTotal = linesTotal(aggregate(sources.filter((s) => s.status !== 'cancelled'), 'original'));

  // Siparişteki tüm onaylı iade tutarı (perakende satış fiyatları üzerinden)
  const allReturnedItems = [
    ...(order.returned_items ?? []),
    ...(order.shipments ?? []).flatMap((s) => s.returned_items ?? []),
  ];
  const totalReturnAmount = round2(
    allReturnedItems.reduce((sum, r) => {
      if (r.total_price && r.total_price > 0) return sum + r.total_price;
      const matched = findOriginal(original, r.productId, r.name);
      const unitP = r.unit_price && r.unit_price > 0 ? r.unit_price : (matched?.unitPrice ?? 0);
      return sum + unitP * r.quantity;
    }, 0),
  );

  const effectiveTotal = round2(Math.max(0, activeTotal - totalReturnAmount));
  const paid = round2(order.payments.filter(isCustomerPayment).reduce((sum, p) => sum + Number(p.amount), 0));
  const changed = remaining.length !== original.length ||
    remaining.some((r, i) => r.quantity !== original[i]?.quantity);

  return {
    original, remaining, originalTotal, activeTotal, totalReturnAmount,
    effectiveTotal, paid, balance: round2(effectiveTotal - paid), changed,
  };
}

/**
 * Gösterilecek sevkiyat kartları, en yeni üstte.
 *
 * Ana sipariş sevk/teslim/iptal/iade edildiyse, çocuk sevkiyatlara taşınmamış
 * kalan kalemler "ana sevkiyat" kartı olarak eklenir.
 */
export function displayShipments(order: TrackedOrder, original: AggregatedLine[]): TrackedShipment[] {
  const childShipments = order.shipments ?? [];
  const all: TrackedShipment[] = [...childShipments];

  const parentStatuses = ['shipped', 'delivered', 'cancelled', 'returned'] as const;
  if (parentStatuses.includes(order.status as typeof parentStatuses[number])) {
    const parentItems = original
      .map((r): TrackedItem | null => {
        const prodId = r.key.split('|')[0] || null;
        // Çocuk sevkiyatlara ayrılmış adet (çocukların kendi kartları var)
        const childAllocatedQty = childShipments.reduce((sum, s) => {
          const match = s.items.find((item) => (prodId && item.productId === prodId) || item.name === r.name);
          return sum + (match?.quantity ?? 0);
        }, 0);
        const diffQty = r.quantity - childAllocatedQty;
        if (diffQty <= 0) return null;
        return {
          productId: prodId,
          name: r.name,
          quantity: diffQty,
          unit_price: r.unitPrice,
          total_price: r.unitPrice * diffQty,
          custom_description: r.customDescription,
        };
      })
      .filter((item): item is TrackedItem => item !== null);

    const isCancelledOrReturned = order.status === 'cancelled' || order.status === 'returned';
    // İptal/iadede kart her zaman gösterilir; sevk/teslimde yalnız kalan kalem varsa.
    if (isCancelledOrReturned || parentItems.length > 0) {
      all.push({
        id: 'parent-shipment',
        order_no: order.order_no,
        status: order.status,
        note: order.note,
        created_at: order.updated_at || order.created_at,
        items: parentItems,
        returned_items: order.returned_items ?? [],
        history: order.history.filter((h) =>
          h.status === 'shipped' || h.status === 'delivered' || h.status === 'cancelled' || h.status === 'returned'),
      });
    }
  }

  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Teslim edilen sevkiyatın satırları: iade düşülmüş net adet ve tutar. */
export function shipmentLines(s: TrackedShipment, original: AggregatedLine[]) {
  const lines = s.items.map((item) => {
    const retItem = s.returned_items?.find(
      (r) => (r.productId && r.productId === item.productId) || (r.name && r.name === item.name),
    );
    const retQty = retItem?.quantity ?? 0;
    const deliveredQty = Math.max(0, item.quantity - retQty);
    const unitP = item.unit_price > 0 ? item.unit_price : (findOriginal(original, item.productId, item.name)?.unitPrice ?? 0);
    return { item, retQty, deliveredQty, unitP, initialTotalP: unitP * item.quantity, netDeliveredTotalP: unitP * deliveredQty };
  });
  const initialTotal = lines.reduce((sum, c) => sum + c.initialTotalP, 0);
  const netDeliveredTotal = lines.reduce((sum, c) => sum + c.netDeliveredTotalP, 0);
  return { lines, initialTotal, netDeliveredTotal, returnTotal: initialTotal - netDeliveredTotal };
}

/** Sevkiyattaki iade satırları — ad ve fiyat eksikse kalemlerden tamamlanır. */
export function returnedLines(s: TrackedShipment, order: TrackedOrder, original: AggregatedLine[]) {
  const lines = (s.returned_items || []).map((r, rIdx) => {
    const rOrderItemId = (field(r, 'order_item_id') as string | undefined)
      || (field(r, 'orderItemId') as string | undefined)
      || r.orderItemId;
    const byItemId = (i: TrackedItem) => field(i, 'id') === rOrderItemId || field(i, 'orderItemId') === rOrderItemId;

    const matchedItem =
      (r.productId ? s.items.find((i) => i.productId === r.productId) : undefined) ||
      (r.productId ? order.items.find((i) => i.productId === r.productId) : undefined) ||
      (rOrderItemId ? s.items.find(byItemId) : undefined) ||
      (rOrderItemId ? order.items.find(byItemId) : undefined) ||
      (r.name ? s.items.find((i) => i.name === r.name) : undefined) ||
      (r.name ? order.items.find((i) => i.name === r.name) : undefined) ||
      (s.items.length === 1 ? s.items[0] : undefined) ||
      (order.items.length === 1 ? order.items[0] : undefined) ||
      s.items[rIdx] ||
      order.items[0];

    const rName = r.name || matchedItem?.name || original[rIdx]?.name || original[0]?.name || 'Ürün';
    const fallbackUnitPrice = original.find((o) => o.name === rName)?.unitPrice ?? (original[rIdx]?.unitPrice ?? (original[0]?.unitPrice ?? 0));
    const rUnitPrice = (r.unit_price && r.unit_price > 0)
      ? r.unit_price
      : (matchedItem?.unit_price && matchedItem.unit_price > 0 ? matchedItem.unit_price : fallbackUnitPrice);
    const rTotal = (r.total_price && r.total_price > 0) ? r.total_price : rUnitPrice * r.quantity;

    return { rName, rQuantity: r.quantity, rUnitPrice, rTotal };
  });
  return { lines, total: lines.reduce((sum, l) => sum + l.rTotal, 0) };
}
