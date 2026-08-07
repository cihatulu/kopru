import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ORG_KIND, STALE_TIME, type OrgKind } from '@/constants';

/**
 * Dönem özeti.
 *
 * İki ayrı RPC var çünkü fiyat izolasyonu raporlarda da geçerlidir (A4):
 * üretici özeti `product_costs` okur ve marj döner; perakendeci özeti
 * `retail_prices` okur ve beklenen kâr döner. Hiçbiri diğerinin katmanına bakmaz.
 */
export interface ManufacturerSummary {
  orderCount: number;
  revenue: number;
  cost: number;
  customerCount: number;
}

export interface RetailerSummary {
  orderCount: number;
  purchaseTotal: number;
  expectedRevenue: number;
  supplierCount: number;
}

type Row = Record<string, unknown>;
const n = (v: unknown): number => Number(v ?? 0);

export function useManufacturerSummary(enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'manufacturer'],
    enabled,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<ManufacturerSummary> => {
      const { data, error } = await supabase.rpc('manufacturer_summary', {});
      if (error) throw error;
      const r = (data ?? {}) as Row;
      return {
        orderCount: n(r.order_count),
        revenue: n(r.revenue),
        cost: n(r.cost),
        customerCount: n(r.customer_count),
      };
    },
  });
}

export function useRetailerSummary(enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'retailer'],
    enabled,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<RetailerSummary> => {
      const { data, error } = await supabase.rpc('retailer_summary', {});
      if (error) throw error;
      const r = (data ?? {}) as Row;
      return {
        orderCount: n(r.order_count),
        purchaseTotal: n(r.purchase_total),
        expectedRevenue: n(r.expected_revenue),
        supplierCount: n(r.supplier_count),
      };
    },
  });
}

/** Çağıranın tipine göre doğru özeti seçer. */
export function useSummaryFor(kind: OrgKind | undefined) {
  const manufacturer = useManufacturerSummary(kind === ORG_KIND.manufacturer);
  const retailer = useRetailerSummary(kind === ORG_KIND.retailer);
  return { manufacturer, retailer };
}
