/** Rapor listelerinin toplanması — SAF (A20). */
import {
  isRevenueOrder,
  type ManufacturerReportsData,
  type ReportOrder,
  type ReportProduct,
} from './reportTypes';

export interface CustomerRow {
  id: string;
  companyName: string;
  totalAmount: number;
  orderCount: number;
}

export interface ProductRow {
  id: string;
  product: ReportProduct;
  quantity: number;
  revenue: number;
  profit: number;
}

export interface CountedProductRow {
  id: string;
  product: ReportProduct;
  quantity: number;
}

export interface SshRow {
  id: string;
  product: ReportProduct;
  count: number;
}

/** Kâr = ciro − (adet × üreticinin maliyeti). Maliyet yoksa 0 kabul edilir. */
const profitOf = (item: { quantity: number; totalPrice: number }, cost: number) =>
  item.totalPrice - item.quantity * cost;

export function topCustomers(data: ManufacturerReportsData): CustomerRow[] {
  const stats = new Map<string, CustomerRow>();

  for (const order of data.orders.filter(isRevenueOrder)) {
    const prev = stats.get(order.retailerOrgId);
    stats.set(order.retailerOrgId, {
      id: order.retailerOrgId,
      companyName: order.retailerName,
      totalAmount: (prev?.totalAmount ?? 0) + order.totalAmount,
      orderCount: (prev?.orderCount ?? 0) + 1,
    });
  }

  return [...stats.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}

export function topProducts(data: ManufacturerReportsData): ProductRow[] {
  const stats = new Map<string, { quantity: number; revenue: number; profit: number }>();

  for (const order of data.orders.filter(isRevenueOrder)) {
    for (const item of order.items) {
      if (!item.productId) continue;
      const prev = stats.get(item.productId) ?? { quantity: 0, revenue: 0, profit: 0 };
      stats.set(item.productId, {
        quantity: prev.quantity + item.quantity,
        revenue: prev.revenue + item.totalPrice,
        profit: prev.profit + profitOf(item, data.costs.get(item.productId) ?? 0),
      });
    }
  }

  return withProduct(data.products, stats).sort((a, b) => b.quantity - a.quantity);
}

/** Ürünü bulunamayan satırlar (silinmiş ürün) listeden düşer. */
function withProduct<T extends object>(
  products: ReportProduct[],
  stats: Map<string, T>,
): (T & { id: string; product: ReportProduct })[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const rows: (T & { id: string; product: ReportProduct })[] = [];

  for (const [id, value] of stats) {
    const product = byId.get(id);
    if (product) rows.push({ ...value, id, product });
  }
  return rows;
}

/** SSH taleplerinde SEÇİLEN ürünlerin arıza sıklığı. */
export function sshDensity(data: ManufacturerReportsData): SshRow[] {
  const stats = new Map<string, { count: number }>();

  for (const req of data.sshRequests) {
    if (!req.productId) continue;
    stats.set(req.productId, { count: (stats.get(req.productId)?.count ?? 0) + 1 });
  }

  return withProduct(data.products, stats).sort((a, b) => b.count - a.count);
}

/** Belirli bir durumdaki siparişlerde geçen ürün adetleri (iptal/iade raporları). */
export function productQuantityByStatus(
  data: ManufacturerReportsData,
  status: ReportOrder['status'],
): CountedProductRow[] {
  const stats = new Map<string, { quantity: number }>();

  for (const order of data.orders.filter((o) => o.status === status)) {
    for (const item of order.items) {
      if (!item.productId) continue;
      const prev = stats.get(item.productId)?.quantity ?? 0;
      stats.set(item.productId, { quantity: prev + item.quantity });
    }
  }

  return withProduct(data.products, stats).sort((a, b) => b.quantity - a.quantity);
}

export function categoriesOf(data: ManufacturerReportsData): string[] {
  return [...new Set(data.products.map((p) => p.category).filter((c): c is string => Boolean(c)))];
}

export function retailersOf(data: ManufacturerReportsData): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const o of data.orders) map.set(o.retailerOrgId, o.retailerName);
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}
