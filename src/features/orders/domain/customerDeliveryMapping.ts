/** Müşteri teslimat planı (`customer_deliveries`) satırlarının okunması — SAF (A20). */
import { nested, nullable, str } from './rowHelpers';

export type CustomerDeliveryStatus = 'planned' | 'shipped' | 'delivered' | 'cancelled';

export interface CustomerDeliverySummary {
  id: string;
  deliveryDate: string;
  timeSlot: string;
  status: CustomerDeliveryStatus;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string | null;
  items: Array<{ order_item_id?: string; name: string; quantity: number }>;
  createdAt: string;
}

export function toCustomerDelivery(raw: unknown): CustomerDeliverySummary {
  const d = nested(raw);
  return {
    id: str(d.id),
    deliveryDate: str(d.delivery_date),
    timeSlot: str(d.time_slot),
    status: (d.status ?? 'planned') as CustomerDeliveryStatus,
    customerName: str(d.customer_name),
    customerPhone: str(d.customer_phone),
    customerAddress: str(d.customer_address),
    notes: nullable(d.notes),
    items: Array.isArray(d.items) ? (d.items as CustomerDeliverySummary['items']) : [],
    createdAt: str(d.created_at),
  };
}

/** Dizi değilse boş liste — gömülü ilişki hiç gelmemiş olabilir. */
export const toCustomerDeliveries = (raw: unknown): CustomerDeliverySummary[] =>
  Array.isArray(raw) ? raw.map(toCustomerDelivery) : [];

/**
 * Teslimata planlanmış adetler: önce kalem kimliğiyle, yoksa ürün adıyla.
 * İptal edilmiş planlar çağıran tarafından süzülmüş olmalıdır.
 */
export function plannedQuantities(deliveries: CustomerDeliverySummary[]) {
  const byItemId = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const d of deliveries) {
    for (const di of d.items) {
      const qty = Number(di.quantity);
      if (di.order_item_id) byItemId.set(di.order_item_id, (byItemId.get(di.order_item_id) ?? 0) + qty);
      if (di.name) byName.set(di.name, (byName.get(di.name) ?? 0) + qty);
    }
  }
  return { byItemId, byName };
}
