import { describe, expect, test } from 'vitest';
import {
  categoriesOf,
  productQuantityByStatus,
  retailersOf,
  sshDensity,
  topCustomers,
  topProducts,
} from './reportAggregates';
import { kpiSummary, marginPercent, monthlyRevenue, profitTotals, profitabilityRows } from './profitability';
import type { ManufacturerReportsData, ReportOrder, ReportProduct } from './reportTypes';

const product = (over: Partial<ReportProduct> = {}): ReportProduct => ({
  id: 'p1',
  name: 'Koltuk',
  code: 'K-1',
  category: 'Oturma',
  images: [],
  ...over,
});

const order = (over: Partial<ReportOrder> = {}): ReportOrder => ({
  id: 'o1',
  orderNo: 'SP-1',
  status: 'delivered',
  totalAmount: 1000,
  createdAt: '2026-08-01T00:00:00Z',
  retailerOrgId: 'r1',
  retailerName: 'Ege Ticaret',
  items: [{ productId: 'p1', name: 'Koltuk', code: 'K-1', quantity: 2, unitPrice: 500, totalPrice: 1000 }],
  ...over,
});

const data = (over: Partial<ManufacturerReportsData> = {}): ManufacturerReportsData => ({
  products: [product()],
  costs: new Map([['p1', 300]]),
  orders: [order()],
  sshRequests: [],
  ...over,
});

describe('topCustomers', () => {
  test('bayi bazında toplar ve ciroya göre sıralar', () => {
    const rows = topCustomers(
      data({
        orders: [
          order(),
          order({ id: 'o2', totalAmount: 500 }),
          order({ id: 'o3', retailerOrgId: 'r2', retailerName: 'Batı', totalAmount: 3000 }),
        ],
      }),
    );
    expect(rows.map((r) => r.companyName)).toEqual(['Batı', 'Ege Ticaret']);
    expect(rows[1]).toMatchObject({ totalAmount: 1500, orderCount: 2 });
  });

  test('iptal ve iade edilen siparişler ciroya girmez', () => {
    const rows = topCustomers(
      data({ orders: [order({ status: 'cancelled' }), order({ id: 'o2', status: 'returned' })] }),
    );
    expect(rows).toHaveLength(0);
  });
});

describe('topProducts', () => {
  test('kâr, üreticinin maliyetiyle hesaplanır', () => {
    const rows = topProducts(data());
    // 1000 ciro - (2 adet × 300 maliyet) = 400
    expect(rows[0]).toMatchObject({ quantity: 2, revenue: 1000, profit: 400 });
  });

  test('maliyeti girilmemiş üründe kâr ciroya eşittir', () => {
    const rows = topProducts(data({ costs: new Map() }));
    expect(rows[0]?.profit).toBe(1000);
  });

  test('silinmiş ürünün satırı düşer', () => {
    expect(topProducts(data({ products: [] }))).toHaveLength(0);
  });
});

describe('productQuantityByStatus', () => {
  test('yalnız istenen durumu sayar', () => {
    const d = data({
      orders: [order({ status: 'cancelled' }), order({ id: 'o2', status: 'delivered' })],
    });
    expect(productQuantityByStatus(d, 'cancelled')[0]?.quantity).toBe(2);
    expect(productQuantityByStatus(d, 'returned')).toHaveLength(0);
  });
});

describe('sshDensity', () => {
  test('ürünsüz talepler sayılmaz', () => {
    const d = data({
      sshRequests: [
        { id: 's1', productId: 'p1', status: 'yeni', createdAt: '', orderId: null },
        { id: 's2', productId: 'p1', status: 'yeni', createdAt: '', orderId: null },
        { id: 's3', productId: null, status: 'yeni', createdAt: '', orderId: null },
      ],
    });
    expect(sshDensity(d)).toHaveLength(1);
    expect(sshDensity(d)[0]?.count).toBe(2);
  });
});

describe('categoriesOf / retailersOf', () => {
  test('kategoriler tekilleşir, boşlar elenir', () => {
    const d = data({
      products: [product(), product({ id: 'p2' }), product({ id: 'p3', category: null })],
    });
    expect(categoriesOf(d)).toEqual(['Oturma']);
  });

  test('bayiler iptal siparişlerden de toplanır', () => {
    const d = data({ orders: [order({ status: 'cancelled' })] });
    expect(retailersOf(d)).toEqual([{ id: 'r1', name: 'Ege Ticaret' }]);
  });
});

describe('profitabilityRows', () => {
  test('ürün × bayi kırılımı ayrı satırlardır', () => {
    const d = data({
      orders: [order(), order({ id: 'o2', retailerOrgId: 'r2', retailerName: 'Batı' })],
    });
    expect(profitabilityRows(d, { search: '', category: '', retailerOrgId: '' })).toHaveLength(2);
  });

  test('bayi süzgeci uygulanır', () => {
    const d = data({
      orders: [order(), order({ id: 'o2', retailerOrgId: 'r2', retailerName: 'Batı' })],
    });
    const rows = profitabilityRows(d, { search: '', category: '', retailerOrgId: 'r2' });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.retailerName).toBe('Batı');
  });

  test('arama ürün adı ve kodunda çalışır', () => {
    expect(profitabilityRows(data(), { search: 'k-1', category: '', retailerOrgId: '' })).toHaveLength(1);
    expect(profitabilityRows(data(), { search: 'masa', category: '', retailerOrgId: '' })).toHaveLength(0);
  });

  test('toplamlar satırlardan çıkar', () => {
    const rows = profitabilityRows(data(), { search: '', category: '', retailerOrgId: '' });
    expect(profitTotals(rows)).toEqual({ revenue: 1000, cost: 600, profit: 400 });
  });
});

describe('marginPercent', () => {
  test('ciro sıfırsa marj tanımsızdır', () => {
    expect(marginPercent(0, 0)).toBeNull();
    expect(marginPercent(400, 1000)).toBe(40);
  });
});

describe('kpiSummary', () => {
  test('yalnız ciroya giren siparişleri sayar', () => {
    const d = data({ orders: [order(), order({ id: 'o2', status: 'cancelled' })] });
    expect(kpiSummary(d)).toEqual({
      totalOrders: 1,
      totalRevenue: 1000,
      netProfit: 400,
      activeRetailers: 1,
    });
  });
});

describe('monthlyRevenue', () => {
  test('son 6 ayı döndürür ve ilgili aya yazar', () => {
    const now = new Date(2026, 7, 15); // Ağustos 2026
    const months = monthlyRevenue(data(), now);
    expect(months).toHaveLength(6);
    expect(months[5]?.key).toBe('2026-08');
    expect(months[5]?.revenue).toBe(1000);
    expect(months[0]?.revenue).toBe(0);
  });

  test('pencere dışındaki sipariş hiçbir aya yazılmaz', () => {
    // Pencere Ocak–Haziran 2027; sipariş Ağustos 2026'da.
    const months = monthlyRevenue(data(), new Date(2027, 5, 15));
    expect(months.every((m) => m.revenue === 0)).toBe(true);
  });
});
