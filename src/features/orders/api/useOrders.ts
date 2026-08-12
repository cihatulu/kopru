import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import type { OrderStatus } from '../domain/status';

// Açık kolon listeleri (kilitli kural 19). Gizli fiyat katmanları burada YOK:
// perakendecinin satış fiyatı `order_item_retail_prices`, üreticinin maliyeti
// `product_costs` tablosundadır (A4).
const ORDER_LIST_COLUMNS =
  'id, order_no, status, total_amount, currency, created_at, customer_name, ' +
  'manufacturer_org_id, retailer_org_id, relationship_id, parent_order_id, ' +
  'manufacturer:manufacturer_org_id(company_name), retailer:retailer_org_id(company_name), ' +
  'order_items(id, product_id, quantity, supplier_unit_price, order_item_retail_prices(retail_unit_price), products:product_id(retail_prices(retail_price)))';

const ORDER_DETAIL_COLUMNS =
  'id, order_no, status, total_amount, currency, created_at, customer_name, ' +
  'manufacturer_org_id, retailer_org_id, relationship_id, parent_order_id, ' +
  'manufacturer:manufacturer_org_id(company_name), retailer:retailer_org_id(company_name), ' +
  'customer_phone, customer_address, note, order_token, ' +
  'order_items(id, product_id, quantity, supplier_unit_price, total_price, product_snapshot, order_item_retail_prices(retail_unit_price), products:product_id(retail_prices(retail_price)))';

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => Number(v ?? 0);
const nullable = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const nested = (v: unknown): Row => (v && typeof v === 'object' ? (v as unknown as Row) : {});

export interface OrderRow {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  manufacturerOrgId: string;
  retailerOrgId: string;
  relationshipId: string;
  counterpartyName: string;
  customerName: string | null;
  parentOrderId: string | null;
}

export interface OrderItemRow {
  id: string;
  productId: string | null;
  name: string;
  code: string;
  quantity: number;
  supplierUnitPrice: number;
  totalPrice: number;
}

export interface OrderStatusLogItem {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: string;
  shipmentBadge?: string | null;
}

export interface ChildShipment {
  id: string;
  shipmentNo: string;
  createdAt: string;
  totalAmount: number;
  status: OrderStatus;
}

export interface OrderDetail extends OrderRow {
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  note: string | null;
  orderToken: string;
  items: OrderItemRow[];
  history: OrderStatusLogItem[];
  shipments: ChildShipment[];
  hasUnfulfilledBalance: boolean;
}

function toRow(raw: unknown, myOrgId: string): OrderRow {
  const r = raw as Row;
  const iAmManufacturer = r.manufacturer_org_id === myOrgId;
  const other = nested(iAmManufacturer ? r.retailer : r.manufacturer);

  let totalAmount = num(r.total_amount);

  // Perakendeci kendi sipariş listesinde perakende satış fiyatı toplamını görür
  if (!iAmManufacturer && Array.isArray(r.order_items)) {
    let calcRetailTotal = 0;
    let hasRetail = false;
    for (const itemRaw of r.order_items) {
      const item = itemRaw as Row;
      const qty = num(item.quantity);
      const retailArr = Array.isArray(item.order_item_retail_prices) ? item.order_item_retail_prices : [];
      let retailPrice = retailArr[0] ? num((retailArr[0] as Row).retail_unit_price) : null;

      // Fallback: sipariş anında kayıt düşmediyse ürünün mevcut perakende fiyatına bak
      if (retailPrice === null || retailPrice <= 0) {
        const prod = nested(item.products);
        const prodRetailArr = Array.isArray(prod.retail_prices) ? prod.retail_prices : [];
        if (prodRetailArr[0]) {
          retailPrice = num((prodRetailArr[0] as Row).retail_price);
        }
      }

      if (retailPrice !== null && retailPrice > 0) {
        calcRetailTotal += retailPrice * qty;
        hasRetail = true;
      } else {
        calcRetailTotal += num(item.supplier_unit_price) * qty;
      }
    }
    if (hasRetail && calcRetailTotal > 0) {
      totalAmount = Math.round(calcRetailTotal * 100) / 100;
    }
  }

  return {
    id: str(r.id),
    orderNo: str(r.order_no),
    status: r.status as OrderStatus,
    totalAmount,
    createdAt: str(r.created_at),
    manufacturerOrgId: str(r.manufacturer_org_id),
    retailerOrgId: str(r.retailer_org_id),
    relationshipId: str(r.relationship_id),
    counterpartyName: str(other.company_name) || '—',
    customerName: nullable(r.customer_name),
    parentOrderId: nullable(r.parent_order_id),
  };
}

function toItem(raw: unknown, isRetailer: boolean): OrderItemRow {
  const i = raw as Row;
  const snap = nested(i.product_snapshot);
  const retailArr = Array.isArray(i.order_item_retail_prices) ? i.order_item_retail_prices : [];
  let retailPrice = retailArr[0] ? num((retailArr[0] as Row).retail_unit_price) : undefined;

  if (isRetailer && (retailPrice === undefined || retailPrice <= 0)) {
    const prod = nested(i.products);
    const prodRetailArr = Array.isArray(prod.retail_prices) ? prod.retail_prices : [];
    if (prodRetailArr[0]) {
      retailPrice = num((prodRetailArr[0] as Row).retail_price);
    }
  }

  const unitPrice = isRetailer && retailPrice !== undefined && retailPrice > 0
    ? retailPrice
    : num(i.supplier_unit_price);

  const qty = num(i.quantity);

  return {
    id: str(i.id),
    productId: nullable(i.product_id),
    name: str(snap.name) || '—',
    code: str(snap.code),
    quantity: qty,
    supplierUnitPrice: unitPrice,
    totalPrice: Math.round(unitPrice * qty * 100) / 100,
  };
}

/** Sipariş listesi — keyset sayfalama (A17). RLS zaten kapsamı daraltır (A16). */
export function useOrders(myOrgId: string, status?: OrderStatus | 'all') {
  return useInfiniteQuery({
    queryKey: ['orders', 'list', myOrgId, status ?? 'all'],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('orders')
        .select(ORDER_LIST_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      if (status && status !== 'all') {
        if (status === 'in_production') {
          q = q.in('status', ['confirmed', 'in_production', 'partially_shipped']);
        } else if (status === 'shipped') {
          q = q.eq('status', 'shipped');
        } else {
          q = q.eq('status', status);
        }
      }
      if (pageParam) {
        q = q.or(
          `created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => toRow(r, myOrgId));
    },
    getNextPageParam: (last) => {
      if (last.length < PAGE_SIZE) return undefined;
      const l = last[last.length - 1];
      return l ? { createdAt: l.createdAt, id: l.id } : undefined;
    },
  });
}

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

      const r = orderRes.data as unknown as Row;
      const isRetailer = r.retailer_org_id === myOrgId;
      const items = Array.isArray(r.order_items) ? r.order_items : [];

      const shipments: ChildShipment[] = (childrenRes.data ?? []).map((c, idx) => ({
        id: str(c.id),
        shipmentNo: `Sevk-${idx + 1}`,
        createdAt: str(c.created_at),
        totalAmount: num(c.total_amount),
        status: (c.status as OrderStatus) ?? 'shipped',
      }));

      let shipmentCounter = 0;
      const history: OrderStatusLogItem[] = (logsRes.data ?? []).map((l) => {
        const toStatus = (l.to_status as OrderStatus) ?? 'pending';
        let shipmentBadge: string | null = null;
        if (toStatus === 'shipped' || toStatus === 'partially_shipped' || (l.note && str(l.note).includes('sevkiyat'))) {
          shipmentCounter++;
          if (shipments[shipmentCounter - 1]) {
            shipmentBadge = shipments[shipmentCounter - 1].shipmentNo;
          } else {
            shipmentBadge = `Sevk-${shipmentCounter}`;
          }
        }
        return {
          id: str(l.id),
          fromStatus: (l.from_status as OrderStatus) ?? null,
          toStatus,
          note: nullable(l.note),
          createdAt: str(l.created_at),
          shipmentBadge,
        };
      });

      // Eğer henüz log kaydı yoksa varsayılan olarak siparişin ilk oluşturulma anını tarihçeye ekle
      if (history.length === 0 && r.created_at) {
        history.push({
          id: 'initial',
          fromStatus: null,
          toStatus: (r.status as OrderStatus) ?? 'pending',
          note: null,
          createdAt: str(r.created_at),
        });
      }

      const status = r.status as OrderStatus;
      const hasUnfulfilledBalance = status === 'partially_shipped' || (shipments.length > 0 && status !== 'delivered' && status !== 'cancelled');

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

export interface OrderStats {
  all: number;
  pending: number;
  in_production: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export function useOrderStats(myOrgId: string) {
  return useQuery({
    queryKey: ['orders', 'stats', myOrgId],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<OrderStats> => {
      const [allRes, pendingRes, productionRes, shippedRes, deliveredRes, cancelledRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'in_production', 'partially_shipped']),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'shipped'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      ]);

      return {
        all: allRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        in_production: productionRes.count ?? 0,
        shipped: shippedRes.count ?? 0,
        delivered: deliveredRes.count ?? 0,
        cancelled: cancelledRes.count ?? 0,
      };
    },
  });
}
