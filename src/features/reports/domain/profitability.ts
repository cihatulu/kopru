/** Karlılık ve KPI hesapları — SAF (A20). */
import { isRevenueOrder, type ManufacturerReportsData, type ReportProduct } from './reportTypes';

export interface ProfitFilters {
  search: string;
  category: string;
  retailerOrgId: string;
}

export const EMPTY_PROFIT_FILTERS: ProfitFilters = { search: '', category: '', retailerOrgId: '' };

export interface ProfitRow {
  product: ReportProduct;
  retailerName: string;
  totalQty: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

export interface ProfitTotals {
  revenue: number;
  cost: number;
  profit: number;
}

export interface Kpi {
  totalOrders: number;
  totalRevenue: number;
  netProfit: number;
  activeRetailers: number;
}

const matches = (p: ReportProduct, f: ProfitFilters): boolean => {
  if (f.category && p.category !== f.category) return false;
  if (!f.search) return true;
  const q = f.search.toLowerCase();
  return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
};

/**
 * Ürün × perakendeci kırılımında karlılık.
 *
 * Anahtar İKİ kolondan oluşur: aynı ürün farklı bayiye farklı iskontoyla
 * satılır, tek satırda toplanırsa marj gerçekte olmayan bir ortalamaya döner.
 */
export function profitabilityRows(
  data: ManufacturerReportsData,
  f: ProfitFilters,
): ProfitRow[] {
  const byId = new Map(data.products.map((p) => [p.id, p]));
  const stats = new Map<string, ProfitRow>();

  for (const order of data.orders.filter(isRevenueOrder)) {
    if (f.retailerOrgId && order.retailerOrgId !== f.retailerOrgId) continue;

    for (const item of order.items) {
      if (!item.productId) continue;
      const product = byId.get(item.productId);
      if (!product || !matches(product, f)) continue;

      const key = `${item.productId}_${order.retailerOrgId}`;
      const prev = stats.get(key);
      const cost = item.quantity * (data.costs.get(item.productId) ?? 0);

      stats.set(key, {
        product,
        retailerName: order.retailerName,
        totalQty: (prev?.totalQty ?? 0) + item.quantity,
        totalRevenue: (prev?.totalRevenue ?? 0) + item.totalPrice,
        totalCost: (prev?.totalCost ?? 0) + cost,
        totalProfit: (prev?.totalProfit ?? 0) + (item.totalPrice - cost),
      });
    }
  }

  return [...stats.values()].sort((a, b) => b.totalProfit - a.totalProfit);
}

export function profitTotals(rows: ProfitRow[]): ProfitTotals {
  return rows.reduce<ProfitTotals>(
    (acc, r) => ({
      revenue: acc.revenue + r.totalRevenue,
      cost: acc.cost + r.totalCost,
      profit: acc.profit + r.totalProfit,
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );
}

/** Ciro sıfırken marj TANIMSIZDIR; sıfır göstermek yanıltıcı olmasın diye null. */
export function marginPercent(profit: number, revenue: number): number | null {
  return revenue > 0 ? (profit / revenue) * 100 : null;
}

export function kpiSummary(data: ManufacturerReportsData): Kpi {
  const orders = data.orders.filter(isRevenueOrder);

  const netProfit = orders.reduce(
    (sum, order) =>
      sum +
      order.items.reduce((s, item) => {
        if (!item.productId) return s;
        const cost = data.costs.get(item.productId) ?? 0;
        return s + (item.totalPrice - item.quantity * cost);
      }, 0),
    0,
  );

  return {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    netProfit,
    activeRetailers: new Set(orders.map((o) => o.retailerOrgId)).size,
  };
}

