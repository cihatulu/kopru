import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import type {
  ManufacturerReportsData,
  ReportOrder,
  ReportOrderItem,
  ReportProduct,
  ReportSsh,
} from '../domain/reportTypes';

// Açık kolon listeleri (kilitli kural 19). Maliyet AYRI tablodan gelir (A4).
const ORDER_COLUMNS = `
  id, order_no, status, total_amount, created_at, retailer_org_id,
  retailer:retailer_org_id(company_name),
  order_items(product_id, quantity, supplier_unit_price, total_price, product_snapshot)
`;

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const nested = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});
const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as unknown[]).map(nested) : []);

function toItem(raw: Row): ReportOrderItem {
  const snap = nested(raw.product_snapshot);
  return {
    productId: raw.product_id ? str(raw.product_id) : null,
    name: str(snap.name) || '—',
    code: str(snap.code),
    quantity: Number(raw.quantity ?? 0),
    unitPrice: Number(raw.supplier_unit_price ?? 0),
    totalPrice: Number(raw.total_price ?? 0),
  };
}

function toOrder(raw: unknown): ReportOrder {
  const o = nested(raw);
  return {
    id: str(o.id),
    orderNo: str(o.order_no),
    status: str(o.status),
    totalAmount: Number(o.total_amount ?? 0),
    createdAt: str(o.created_at),
    retailerOrgId: str(o.retailer_org_id),
    retailerName: str(nested(o.retailer).company_name) || 'Bilinmeyen Bayi',
    items: list(o.order_items).map(toItem),
  };
}

export function useManufacturerReports(myOrgId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'manufacturer-detailed', myOrgId],
    enabled: !!myOrgId && enabled,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<ManufacturerReportsData> => {
      const orgId = myOrgId ?? '';

      const [resProducts, resCosts, resOrders, resSsh] = await Promise.all([
        supabase.from('products').select('id, name, code, category, images').eq('owner_org_id', orgId),
        supabase.from('product_costs').select('product_id, cost_price').eq('owner_org_id', orgId),
        supabase.from('orders').select(ORDER_COLUMNS).eq('manufacturer_org_id', orgId),
        supabase
          .from('ssh_requests')
          .select('id, product_id, status, created_at, order_id')
          .eq('manufacturer_org_id', orgId),
      ]);

      if (resProducts.error) throw resProducts.error;
      if (resCosts.error) throw resCosts.error;
      if (resOrders.error) throw resOrders.error;
      if (resSsh.error) throw resSsh.error;

      const products: ReportProduct[] = (resProducts.data ?? []).map((p) => ({
        id: String(p.id),
        name: String(p.name),
        code: String(p.code ?? ''),
        category: p.category ?? null,
        images: Array.isArray(p.images) ? p.images.map((i) => String(i)) : [],
      }));

      const sshRequests: ReportSsh[] = (resSsh.data ?? []).map((s) => ({
        id: String(s.id),
        productId: s.product_id ? String(s.product_id) : null,
        status: String(s.status),
        createdAt: String(s.created_at),
        orderId: s.order_id ? String(s.order_id) : null,
      }));

      return {
        products,
        costs: new Map((resCosts.data ?? []).map((c) => [String(c.product_id), Number(c.cost_price ?? 0)])),
        orders: (resOrders.data ?? []).map(toOrder),
        sshRequests,
      };
    },
  });
}
