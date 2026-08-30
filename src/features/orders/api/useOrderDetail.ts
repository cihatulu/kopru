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
} from '../domain/orderMapping';
import { buildHistory } from '../domain/orderHistory';

// Açık kolon listesi (kilitli kural 19). Gizli fiyat katmanları yok (A4).
const ORDER_DETAIL_COLUMNS =
  'id, order_no, status, total_amount, currency, created_at, customer_name, ' +
  'manufacturer_org_id, retailer_org_id, relationship_id, parent_order_id, ' +
  'manufacturer:manufacturer_org_id(company_name), retailer:retailer_org_id(company_name), ' +
  'customer_phone, customer_address, note, order_token, ' +
  'order_items(id, product_id, quantity, supplier_unit_price, total_price, product_snapshot, custom_description, price_difference, order_item_retail_prices(retail_unit_price), products:product_id(retail_prices(retail_price))), ' +
  'return_requests(approved_amount, status, items)';

export function useOrderDetail(orderId: string | null, myOrgId: string) {
  return useQuery({
    queryKey: ['orders', 'detail', orderId],
    enabled: !!orderId,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<OrderDetail | null> => {
      const [orderRes, childrenRes] = await Promise.all([
        supabase
          .from('orders')
          .select(ORDER_DETAIL_COLUMNS)
          .eq('id', orderId ?? '')
          .maybeSingle(),
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

      let resolvedOrderToken = str(r.order_token);
      if (r.parent_order_id) {
        const { data: pRow } = await supabase
          .from('orders')
          .select('order_token')
          .eq('id', str(r.parent_order_id))
          .maybeSingle();
        if (pRow?.order_token) {
          resolvedOrderToken = str(pRow.order_token);
        }
      }

      const shipments: ChildShipment[] = (childrenRes.data ?? []).map((c, idx) => ({
        id: str(c.id),
        shipmentNo: `Sevk-${idx + 1}`,
        createdAt: str(c.created_at),
        totalAmount: num(c.total_amount),
        status: c.status ?? 'shipped',
      }));

      /*
       * Tarihçe ÇOCUK siparişlerin kayıtlarını da içerir.
       *
       * NEDEN: sevkiyatın OLUŞTURULMASI köke yazılıyor ama İPTALİ çocuğa.
       * Yalnız kökü sorgulayınca aynı sevkiyatın doğuşu görünüyor, ölümü
       * görünmüyordu — kullanıcı iptal ettiği sevkiyatı kök detayda hâlâ
       * "Sevk Edildi" olarak görüyordu.
       *
       * Sorgu çocuklardan SONRA çalışır; bu yüzden paralel değil.
       */
      const logsRes = await supabase
        .from('order_status_logs')
        .select('id, order_id, from_status, to_status, note, created_at')
        .in('order_id', [orderId ?? '', ...shipments.map((s) => s.id)])
        .order('created_at', { ascending: true });

      // Onaylı iade talepleri — items JSONB [{order_item_id, quantity}] formatında.
      const returnsRes = await supabase
        .from('return_requests')
        .select('id, items')
        .eq('order_id', orderId ?? '')
        .eq('status', 'approved');

      // order_item_id → iade adedi haritası
      const returnedQtyMap = new Map<string, number>();
      if (!returnsRes.error && returnsRes.data) {
        for (const rr of returnsRes.data) {
          const rItems = Array.isArray(rr.items) ? rr.items : [];
          for (const ri of rItems as Array<{ order_item_id: string; quantity: number }>) {
            const prev = returnedQtyMap.get(ri.order_item_id) ?? 0;
            returnedQtyMap.set(ri.order_item_id, prev + Number(ri.quantity));
          }
        }
      }

      // Müşteri teslimatları — SADECE bu sipariş/sevkiyat için planlanan ürün miktarları
      const deliveriesRes = await supabase
        .from('customer_deliveries')
        .select('id, delivery_date, time_slot, status, customer_name, customer_phone, customer_address, notes, items, created_at')
        .eq('order_id', orderId ?? '')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      const plannedQtyMap = new Map<string, number>();
      const plannedByNameMap = new Map<string, number>();
      if (!deliveriesRes.error && deliveriesRes.data) {
        for (const cd of deliveriesRes.data) {
          const dItems = Array.isArray(cd.items) ? cd.items : [];
          for (const di of dItems as Array<{ order_item_id?: string; name?: string; quantity: number }>) {
            if (di.order_item_id) {
              const prev = plannedQtyMap.get(di.order_item_id) ?? 0;
              plannedQtyMap.set(di.order_item_id, prev + Number(di.quantity));
            }
            if (di.name) {
              const prev = plannedByNameMap.get(di.name) ?? 0;
              plannedByNameMap.set(di.name, prev + Number(di.quantity));
            }
          }
        }
      }

      const history = buildHistory(logsRes.data ?? [], shipments, orderId ?? '');
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

      const mappedItems = items.map((item) => {
        const i = item as Record<string, unknown>;
        const itemId = typeof i.id === 'string' ? i.id : '';
        const snap = (i.product_snapshot && typeof i.product_snapshot === 'object')
          ? (i.product_snapshot as Record<string, unknown>)
          : {};
        const itemName = typeof snap.name === 'string' ? snap.name : '';
        const returnedQty = returnedQtyMap.get(itemId) ?? 0;
        const plannedQty = plannedQtyMap.get(itemId) ?? (itemName ? (plannedByNameMap.get(itemName) ?? 0) : 0);
        return toItem(item, isRetailer, returnedQty, plannedQty);
      });

      // İade toplam tutarı (perakende fiyatı üzerinden)
      let returnTotalAmount = 0;
      for (const mi of mappedItems) {
        if (mi.returnedQty > 0) {
          returnTotalAmount += (mi.supplierUnitPrice + mi.priceDifference) * mi.returnedQty;
        }
      }

      const mappedDeliveries: CustomerDeliverySummary[] = (deliveriesRes.data ?? []).map((rawD) => ({
        id: str(rawD.id),
        deliveryDate: str(rawD.delivery_date),
        timeSlot: str(rawD.time_slot),
        status: (rawD.status ?? 'planned') as 'planned' | 'shipped' | 'delivered' | 'cancelled',
        customerName: str(rawD.customer_name),
        customerPhone: str(rawD.customer_phone),
        customerAddress: str(rawD.customer_address),
        notes: nullable(rawD.notes),
        items: Array.isArray(rawD.items) ? (rawD.items as Array<{ order_item_id?: string; name: string; quantity: number }>) : [],
        createdAt: str(rawD.created_at),
      }));

      return {
        ...toRow(r, myOrgId),
        customerPhone: nullable(r.customer_phone),
        customerAddress: nullable(r.customer_address),
        note: nullable(r.note),
        orderToken: resolvedOrderToken || null,
        items: mappedItems,
        history,
        shipments,
        customerDeliveries: mappedDeliveries,
        latestDelivery: mappedDeliveries[0] ?? null,
        hasUnfulfilledBalance,
        returnTotalAmount,
      };
    },
  });
}

