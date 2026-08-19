import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import { useAuthSession } from '@/features/auth';
import { orderRetailTotal } from '../domain/finance';
import type { FinanceTransaction, MinimalOrder, MinimalReturnRequest } from '../domain/finance';
import { computeFinanceStats, type FinanceStats } from '../domain/financeStats';
import { buildCustomerLedgers, type CustomerLedger } from '../domain/customerLedger';

/**
 * Perakendecinin kasa/POS defteri — SORGULAR.
 *
 * Hesaplamalar domain'de: özetler `domain/financeStats.ts`, müşteri carileri
 * `domain/customerLedger.ts`. Buradaki iki "stats/ledger" hook'u yalnız
 * sorguyu saf fonksiyona bağlayan ince sarmalayıcılardır.
 * Yazma uçları `useFinanceMutations.ts`.
 */

export type { FinanceTransaction, MinimalOrder, MinimalReturnRequest } from '../domain/finance';
export type { FinanceStats } from '../domain/financeStats';
export type { CustomerLedger } from '../domain/customerLedger';

export function useFinanceTransactions() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;

  return useQuery<FinanceTransaction[]>({
    queryKey: ['finance_transactions', orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME.transactional,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('finance_entries')
        .select(
          // FK adı açıkça verilir: finance_entries ve orders'ın organizations'a
          // birden fazla bağı var (üretici + perakendeci), PostgREST ipucu ister.
          `id, retailer_org_id, kind, method, amount, description, order_id,
           manufacturer_org_id, created_at,
           order:orders(
             customer_name,
             manufacturer:organizations!orders_manufacturer_org_id_fkey(company_name)
           ),
           manufacturer:organizations!finance_entries_manufacturer_org_id_fkey(company_name)`,
        )
        .eq('retailer_org_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((t) => ({
        id: t.id,
        retailer_id: t.retailer_org_id,
        type: t.kind,
        method: t.method,
        amount: Number(t.amount),
        description: t.description,
        order_id: t.order_id,
        manufacturer_id: t.manufacturer_org_id,
        created_at: t.created_at,
        order: t.order,
        manufacturer: t.manufacturer,
      }));
    },
  });
}

const isRow = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const asRows = (v: unknown): Record<string, unknown>[] => {
  if (Array.isArray(v)) return (v as unknown[]).filter(isRow);
  return isRow(v) ? [v] : [];
};
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const nested = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export function useAllOrders() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;

  return useQuery<MinimalOrder[]>({
    queryKey: ['orders', 'all-finance', orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME.transactional,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(
          // Müşteri carisi KATMAN 3'ten kurulur; kalem satış fiyatları da çekilir.
          `id, order_no, created_at, updated_at, parent_order_id, total_amount, status,
           customer_name, customer_phone, customer_address,
           order_items(id, quantity, supplier_unit_price, product_snapshot,
                       order_item_retail_prices(retail_unit_price)),
           manufacturer:organizations!orders_manufacturer_org_id_fkey(company_name)`,
        )
        .eq('retailer_org_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((o) => {
        const orderItems = asRows(o.order_items).map(oi => {
          const priced = asRows(oi.order_item_retail_prices)[0];
          const retail = priced ? Number(priced.retail_unit_price ?? 0) : 0;
          const unit = retail > 0 ? retail : Number(oi.supplier_unit_price ?? 0);
          const snap = nested(oi.product_snapshot);
          return {
            id: str(oi.id),
            quantity: Number(oi.quantity || 0),
            supplierUnitPrice: Number(oi.supplier_unit_price || 0),
            retailUnitPrice: unit,
            name: str(snap.name) || 'Ürün',
          };
        });

        return {
          id: o.id,
          orderNo: o.order_no,
          createdAt: o.created_at,
          updatedAt: o.updated_at || null,
          parentOrderId: o.parent_order_id,
          status: str(o.status),
          totalAmount: orderRetailTotal(o.order_items, Number(o.total_amount)),
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          customerAddress: o.customer_address,
          manufacturerName: o.manufacturer?.company_name || null,
          items: orderItems,
        };
      });
    },
  });
}

export function useManufacturers() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;

  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['finance', 'manufacturers', orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME.catalog,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('relationships')
        .select(
          `manufacturer_org_id,
           manufacturer:organizations!relationships_manufacturer_org_id_manufacturer_kind_fkey(id, company_name)`,
        )
        .eq('retailer_org_id', orgId)
        .eq('status', 'active');
      if (error) throw error;

      return (data ?? []).map((r) => ({
        id: r.manufacturer?.id || r.manufacturer_org_id,
        name: r.manufacturer?.company_name || 'Bilinmeyen Üretici',
      }));
    },
  });
}

export function useApprovedReturnRequests() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;

  return useQuery<MinimalReturnRequest[]>({
    queryKey: ['finance', 'approved-returns', orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME.transactional,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('return_requests')
        .select('id, order_id, decided_at, created_at, items')
        .eq('retailer_org_id', orgId)
        .eq('status', 'approved');
      if (error) throw error;

      return (data ?? []).map((r) => {
        const rawItems = (Array.isArray(r.items) ? r.items : []) as Record<string, unknown>[];
        return {
          id: r.id,
          orderId: r.order_id,
          decidedAt: r.decided_at || r.created_at,
          items: rawItems.map(i => ({
            orderItemId: typeof i.order_item_id === 'string' ? i.order_item_id : '',
            quantity: Number(i.quantity || 0)
          }))
        };
      });
    },
  });
}

/** Kasa/POS özetleri — hesap `domain/financeStats.ts`'te. */
export function useFinanceStats(): FinanceStats {
  const { data: transactions } = useFinanceTransactions();
  return computeFinanceStats(transactions);
}

/** Müşteri carileri — hesap `domain/customerLedger.ts`'te. */
export function useCustomerLedgers(
  orders: MinimalOrder[] | undefined,
  returnRequests: MinimalReturnRequest[] | undefined,
): CustomerLedger[] {
  const { data: transactions } = useFinanceTransactions();
  return buildCustomerLedgers(orders, transactions, returnRequests);
}
