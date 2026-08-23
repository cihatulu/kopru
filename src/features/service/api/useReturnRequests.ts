import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import { filterOps, type ServiceFilters } from '../domain/filters';
import {
  RETURN_COLUMNS,
  counterpartyName,
  keyset,
  nested,
  next,
  nullableStr,
  str,
  type Cursor,
  type ReturnStatus,
  type Row,
} from './shared';

export interface ReturnItemDetail {
  orderItemId: string;
  quantity: number;
  name: string;
  unitPrice: number;
  totalPrice: number;
}

export interface ReturnRequest extends Cursor {
  id: string;
  status: ReturnStatus;
  reason: string | null;
  /** Onay anında SİPARİŞTEN hesaplanan tutar; talep sahibi belirleyemez. */
  approvedAmount: number | null;
  /** Talep anındaki kalemlerin toplam tutarı */
  requestedAmount: number;
  /** Tabloda ve ekranda gösterilecek geçerli iade tutarı (onaylıysa approvedAmount, değilse requestedAmount) */
  totalAmount: number;
  createdAt: string;
  decidedAt: string | null;
  orderNo: string;
  counterpartyName: string;
  manufacturerOrgId: string;
  items: ReturnItemDetail[];
}

function toReturn(raw: unknown, myOrgId: string): ReturnRequest {
  const r = raw as Row;
  const orderObj = nested(r.orders);
  const rawOrderItems = (Array.isArray(orderObj.order_items) ? orderObj.order_items : []) as Row[];
  const returnItems = (Array.isArray(r.items) ? r.items : []) as Row[];

  const items: ReturnItemDetail[] = returnItems.map((item) => {
    const itemId = str(item.order_item_id);
    const qty = Number(item.quantity || 1);
    const foundOrderItem = rawOrderItems.find((oi) => str(oi.id) === itemId);
    const snap = nested(foundOrderItem?.product_snapshot);
    const name = str(snap.name) || 'İade Ürün';
    const unitPrice = Number(foundOrderItem?.supplier_unit_price ?? snap.supplier_price ?? 0);
    return {
      orderItemId: itemId,
      quantity: qty,
      name,
      unitPrice,
      totalPrice: unitPrice * qty,
    };
  });

  const requestedAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const approvedAmount = r.approved_amount == null ? null : Number(r.approved_amount);
  const totalAmount = approvedAmount ?? requestedAmount;

  return {
    id: str(r.id),
    status: r.status as ReturnStatus,
    reason: nullableStr(r.reason),
    approvedAmount,
    requestedAmount,
    totalAmount,
    createdAt: str(r.created_at),
    decidedAt: nullableStr(r.decided_at),
    orderNo: str(orderObj.order_no),
    counterpartyName: counterpartyName(r, myOrgId),
    manufacturerOrgId: str(r.manufacturer_org_id),
    items,
  };
}

/** İade talepleri — keyset sayfalama (A17), filtreler sorgu anahtarında. */
export function useReturnRequests(myOrgId: string, myKind: string, filters: ServiceFilters) {
  return useInfiniteQuery({
    queryKey: ['service', 'returns', myOrgId, filters],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as Cursor | undefined,
    queryFn: async ({ pageParam }) => {
      const ops = filterOps(filters, myKind);

      let q = supabase
        .from('return_requests')
        .select(RETURN_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      for (const [column, value] of ops.equals) q = q.eq(column, value);
      if (ops.gte) q = q.gte('created_at', ops.gte);
      if (ops.lt) q = q.lt('created_at', ops.lt);
      if (pageParam) q = q.or(keyset(pageParam));

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((raw) => toReturn(raw, myOrgId));
    },
    getNextPageParam: (last) => next(last, PAGE_SIZE),
  });
}
