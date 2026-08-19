import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import { toRow } from '../domain/orderMapping';
import type { OrderStatus } from '../domain/status';

// Açık kolon listeleri (kilitli kural 19). Gizli fiyat katmanları burada YOK:
// perakendecinin satış fiyatı `order_item_retail_prices`, üreticinin maliyeti
// `product_costs` tablosundadır (A4).
const ORDER_LIST_COLUMNS =
  'id, order_no, status, total_amount, currency, created_at, customer_name, ' +
  'manufacturer_org_id, retailer_org_id, relationship_id, parent_order_id, ' +
  'manufacturer:manufacturer_org_id(company_name), retailer:retailer_org_id(company_name), ' +
  'order_items(id, product_id, quantity, supplier_unit_price, order_item_retail_prices(retail_unit_price), products:product_id(retail_prices(retail_price))), ' +
  'return_requests(approved_amount, status, items)';

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
        // "Üretiliyor" süzgeci onay ve kısmi sevkiyat aşamalarını da kapsar.
        q = status === 'in_production'
          ? q.in('status', ['confirmed', 'in_production', 'partially_shipped'])
          : q.eq('status', status);
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
