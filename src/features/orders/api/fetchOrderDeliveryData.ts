import { supabase } from '@/lib/supabase';
import {
  toCustomerDeliveries,
  type CustomerDeliverySummary,
} from '../domain/customerDeliveryMapping';

/**
 * Sipariş detayının yan sorguları. Hata durumunda boş döner: bu veriler
 * detayı yalnız zenginleştirir, eksikliği detayı göstermeyi engellememeli.
 */

/** Onaylı iadeler: order_item_id → iade adedi. items JSONB [{order_item_id, quantity}]. */
export async function fetchReturnedQuantities(orderId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data, error } = await supabase
    .from('return_requests')
    .select('id, items')
    .eq('order_id', orderId)
    .eq('status', 'approved');
  if (error || !data) return map;
  for (const rr of data) {
    const rItems = Array.isArray(rr.items) ? rr.items : [];
    for (const ri of rItems as Array<{ order_item_id: string; quantity: number }>) {
      map.set(ri.order_item_id, (map.get(ri.order_item_id) ?? 0) + Number(ri.quantity));
    }
  }
  return map;
}

/** Müşteri teslimatları — SADECE bu sipariş/sevkiyat için, iptal edilenler hariç, en yeni önce. */
export async function fetchCustomerDeliveries(orderId: string): Promise<CustomerDeliverySummary[]> {
  const { data, error } = await supabase
    .from('customer_deliveries')
    .select('id, delivery_date, time_slot, status, customer_name, customer_phone, customer_address, notes, items, created_at')
    .eq('order_id', orderId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return toCustomerDeliveries(data);
}
