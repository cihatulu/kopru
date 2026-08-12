import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

export interface ReportProduct {
  id: string;
  name: string;
  code: string;
  category: string | null;
  images: string[];
}

export interface ReportCost {
  productId: string;
  costPrice: number;
}

export interface ReportOrderItem {
  productId: string | null;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReportOrder {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  retailerOrgId: string;
  retailerName: string;
  items: ReportOrderItem[];
}

export interface ReportSsh {
  id: string;
  productId: string | null;
  status: string;
  createdAt: string;
  orderId: string | null;
}

export interface ManufacturerReportsData {
  products: ReportProduct[];
  costs: Map<string, number>;
  orders: ReportOrder[];
  sshRequests: ReportSsh[];
}

export function useManufacturerReports(myOrgId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'manufacturer-detailed', myOrgId],
    enabled: !!myOrgId && enabled,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<ManufacturerReportsData> => {
      const orgId = myOrgId!;

      // 1. Fetch products
      const productsPromise = supabase
        .from('products')
        .select('id, name, code, category, images')
        .eq('owner_org_id', orgId);

      // 2. Fetch costs
      const costsPromise = supabase
        .from('product_costs')
        .select('product_id, cost_price')
        .eq('owner_org_id', orgId);

      // 3. Fetch orders and items
      const ordersPromise = supabase
        .from('orders')
        .select(`
          id,
          order_no,
          status,
          total_amount,
          created_at,
          retailer_org_id,
          retailer:retailer_org_id(company_name),
          order_items(product_id, quantity, supplier_unit_price, total_price, product_snapshot)
        `)
        .eq('manufacturer_org_id', orgId);

      // 4. Fetch ssh requests
      const sshPromise = supabase
        .from('ssh_requests')
        .select('id, product_id, status, created_at, order_id')
        .eq('manufacturer_org_id', orgId);

      const [resProducts, resCosts, resOrders, resSsh] = await Promise.all([
        productsPromise,
        costsPromise,
        ordersPromise,
        sshPromise,
      ]);

      if (resProducts.error) throw resProducts.error;
      if (resCosts.error) throw resCosts.error;
      if (resOrders.error) throw resOrders.error;
      if (resSsh.error) throw resSsh.error;

      // Map products
      const products: ReportProduct[] = (resProducts.data ?? []).map((p) => ({
        id: String(p.id),
        name: String(p.name),
        code: String(p.code ?? ''),
        category: (p.category as string | null) || null,
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
      }));

      // Map costs
      const costsMap = new Map<string, number>(
        (resCosts.data ?? []).map((c) => [String(c.product_id), Number(c.cost_price ?? 0)])
      );

      // Map orders
      const orders: ReportOrder[] = (resOrders.data ?? []).map((o: any) => {
        const items: ReportOrderItem[] = (o.order_items ?? []).map((i: any) => {
          const snap = (i.product_snapshot || {}) as Record<string, any>;
          return {
            productId: i.product_id ? String(i.product_id) : null,
            name: String(snap.name || i.name || '—'),
            code: String(snap.code || i.code || ''),
            quantity: Number(i.quantity ?? 0),
            unitPrice: Number(i.supplier_unit_price ?? 0),
            totalPrice: Number(i.total_price ?? 0),
          };
        });

        return {
          id: String(o.id),
          orderNo: String(o.order_no),
          status: String(o.status),
          totalAmount: Number(o.total_amount ?? 0),
          createdAt: String(o.created_at),
          retailerOrgId: String(o.retailer_org_id),
          retailerName: String(o.retailer?.company_name || 'Bilinmeyen Bayi'),
          items,
        };
      });

      // Map SSH
      const sshRequests: ReportSsh[] = (resSsh.data ?? []).map((s) => ({
        id: String(s.id),
        productId: s.product_id ? String(s.product_id) : null,
        status: String(s.status),
        createdAt: String(s.created_at),
        orderId: s.order_id ? String(s.order_id) : null,
      }));

      return {
        products,
        costs: costsMap,
        orders,
        sshRequests,
      };
    },
  });
}
