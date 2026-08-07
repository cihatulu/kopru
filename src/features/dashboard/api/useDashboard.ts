import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

type Row = Record<string, unknown>;
const n = (v: unknown): number => Number(v ?? 0);

export interface ManufacturerDashboard {
  productCount: number;
  partnerCount: number;
  pendingOrders: number;
  pendingReturns: number;
  pendingSsh: number;
  netRevenue: number;
  returnedAmount: number;
  approvedReturns: number;
  completedSsh: number;
}

export interface RetailerDashboard {
  supplierCount: number;
  openOrders: number;
  pendingReturns: number;
  pendingSsh: number;
  purchaseTotal: number;
  totalDebt: number;
}

/**
 * Panel özeti. Sunucu, çağıranın org tipine göre doğru sayıları döndürür —
 * fiyat izolasyonu (A4) burada da geçerlidir.
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<Row> => {
      const { data, error } = await supabase.rpc('dashboard_summary');
      if (error) throw error;
      return (data ?? {}) as Row;
    },
  });
}

export function toManufacturer(r: Row): ManufacturerDashboard {
  return {
    productCount: n(r.product_count),
    partnerCount: n(r.partner_count),
    pendingOrders: n(r.pending_orders),
    pendingReturns: n(r.pending_returns),
    pendingSsh: n(r.pending_ssh),
    netRevenue: n(r.net_revenue),
    returnedAmount: n(r.returned_amount),
    approvedReturns: n(r.approved_returns),
    completedSsh: n(r.completed_ssh),
  };
}

export function toRetailer(r: Row): RetailerDashboard {
  return {
    supplierCount: n(r.supplier_count),
    openOrders: n(r.open_orders),
    pendingReturns: n(r.pending_returns),
    pendingSsh: n(r.pending_ssh),
    purchaseTotal: n(r.purchase_total),
    totalDebt: n(r.total_debt),
  };
}
