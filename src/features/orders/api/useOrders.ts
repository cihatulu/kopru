import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import type { OrderStatus } from '../domain/status';

// Açık kolon listeleri (kilitli kural 19). Gizli fiyat katmanları burada YOK:
// perakendecinin satış fiyatı `order_item_retail_prices`, üreticinin maliyeti
// `product_costs` tablosundadır (A4).
const ORDER_LIST_COLUMNS =
  'id, order_no, status, total_amount, currency, created_at, ' +
  'manufacturer_org_id, retailer_org_id, relationship_id, ' +
  'manufacturer:manufacturer_org_id(company_name), retailer:retailer_org_id(company_name)';

const ORDER_DETAIL_COLUMNS =
  ORDER_LIST_COLUMNS +
  ', customer_name, customer_phone, customer_address, note, order_token, ' +
  'order_items(id, product_id, quantity, supplier_unit_price, total_price, product_snapshot)';

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

export interface OrderDetail extends OrderRow {
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  note: string | null;
  orderToken: string;
  items: OrderItemRow[];
}

function toRow(raw: unknown, myOrgId: string): OrderRow {
  const r = raw as Row;
  const iAmManufacturer = r.manufacturer_org_id === myOrgId;
  const other = nested(iAmManufacturer ? r.retailer : r.manufacturer);
  return {
    id: str(r.id),
    orderNo: str(r.order_no),
    status: r.status as OrderStatus,
    totalAmount: num(r.total_amount),
    createdAt: str(r.created_at),
    manufacturerOrgId: str(r.manufacturer_org_id),
    retailerOrgId: str(r.retailer_org_id),
    relationshipId: str(r.relationship_id),
    counterpartyName: str(other.company_name) || '—',
  };
}

function toItem(raw: unknown): OrderItemRow {
  const i = raw as Row;
  const snap = nested(i.product_snapshot);
  return {
    id: str(i.id),
    productId: nullable(i.product_id),
    name: str(snap.name) || '—',
    code: str(snap.code),
    quantity: num(i.quantity),
    supplierUnitPrice: num(i.supplier_unit_price),
    totalPrice: num(i.total_price),
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

      if (status && status !== 'all') q = q.eq('status', status);
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
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_DETAIL_COLUMNS)
        .eq('id', orderId ?? '')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const r = data as unknown as Row;
      const items = Array.isArray(r.order_items) ? r.order_items : [];
      return {
        ...toRow(r, myOrgId),
        customerName: nullable(r.customer_name),
        customerPhone: nullable(r.customer_phone),
        customerAddress: nullable(r.customer_address),
        note: nullable(r.note),
        orderToken: str(r.order_token),
        items: items.map(toItem),
      };
    },
  });
}
