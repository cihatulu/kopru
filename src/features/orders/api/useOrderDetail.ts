import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import type { OrderStatus } from '../domain/status';
import {
  nullable,
  num,
  str,
  toItem,
  toRow,
  type ChildShipment,
  type OrderDetail,
  type OrderStatusLogItem,
} from '../domain/orderMapping';

// Açık kolon listesi (kilitli kural 19). Gizli fiyat katmanları yok (A4).
const ORDER_DETAIL_COLUMNS =
  'id, order_no, status, total_amount, currency, created_at, customer_name, ' +
  'manufacturer_org_id, retailer_org_id, relationship_id, parent_order_id, ' +
  'manufacturer:manufacturer_org_id(company_name), retailer:retailer_org_id(company_name), ' +
  'customer_phone, customer_address, note, order_token, ' +
  'order_items(id, product_id, quantity, supplier_unit_price, total_price, product_snapshot, custom_description, order_item_retail_prices(retail_unit_price), products:product_id(retail_prices(retail_price)))';

export function useOrderDetail(orderId: string | null, myOrgId: string) {
  return useQuery({
    queryKey: ['orders', 'detail', orderId],
    enabled: !!orderId,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<OrderDetail | null> => {
      const [orderRes, logsRes, childrenRes] = await Promise.all([
        supabase
          .from('orders')
          .select(ORDER_DETAIL_COLUMNS)
          .eq('id', orderId ?? '')
          .maybeSingle(),
        supabase
          .from('order_status_logs')
          .select('id, from_status, to_status, note, created_at')
          .eq('order_id', orderId ?? '')
          .order('created_at', { ascending: true }),
        supabase
          .from('orders')
          .select('id, order_no, status, total_amount, created_at')
          .eq('parent_order_id', orderId ?? '')
          .order('created_at', { ascending: true }),
      ]);

      if (orderRes.error) throw orderRes.error;
      if (!orderRes.data) return null;

      const r = orderRes.data as unknown as Record<string, unknown>;
      const isRetailer = r.retailer_org_id === myOrgId;
      const items = Array.isArray(r.order_items) ? (r.order_items as unknown[]) : [];

      const shipments: ChildShipment[] = (childrenRes.data ?? []).map((c, idx) => ({
        id: str(c.id),
        shipmentNo: `Sevk-${idx + 1}`,
        createdAt: str(c.created_at),
        totalAmount: num(c.total_amount),
        status: c.status ?? 'shipped',
      }));

      const history = buildHistory(logsRes.data ?? [], shipments);
      if (history.length === 0 && r.created_at) {
        history.push({
          id: 'initial',
          fromStatus: null,
          toStatus: (r.status as OrderStatus | null) ?? 'pending',
          note: null,
          createdAt: str(r.created_at),
        });
      }

      const status = r.status as OrderStatus;
      const hasUnfulfilledBalance =
        status === 'partially_shipped' ||
        (shipments.length > 0 && status !== 'delivered' && status !== 'cancelled');

      return {
        ...toRow(r, myOrgId),
        customerPhone: nullable(r.customer_phone),
        customerAddress: nullable(r.customer_address),
        note: nullable(r.note),
        orderToken: str(r.order_token),
        items: items.map((item) => toItem(item, isRetailer)),
        history,
        shipments,
        hasUnfulfilledBalance,
      };
    },
  });
}

interface LogRow {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus | null;
  note: string | null;
  created_at: string;
}

/** Sevkiyat içeren durum kayıtlarına sırasıyla "Sevk-N" rozeti takılır. */
function buildHistory(logs: LogRow[], shipments: ChildShipment[]): OrderStatusLogItem[] {
  let counter = 0;
  return logs.map((l) => {
    const toStatus = l.to_status ?? 'pending';
    let shipmentBadge: string | null = null;

    if (toStatus === 'shipped' || toStatus === 'partially_shipped' || str(l.note).includes('sevkiyat')) {
      counter++;
      shipmentBadge = shipments[counter - 1]?.shipmentNo ?? `Sevk-${counter}`;
    }

    return {
      id: str(l.id),
      fromStatus: l.from_status ?? null,
      toStatus,
      note: nullable(l.note),
      createdAt: str(l.created_at),
      shipmentBadge,
    };
  });
}
