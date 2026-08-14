import { describe, expect, test } from 'vitest';
import { toItem, toRow } from './orderMapping';

/**
 * PostgREST bire-bir gömmeyi İKİ ŞEKİLDE döndürür: tek elemanlı dizi ya da
 * doğrudan nesne. Testler ikisini de kapsar — yalnız dizi karşılandığı için
 * kayıtlı perakende fiyatı görünmez olmuş, ekran ürünün güncel fiyatına
 * düşmüştü (sipariş 45.000 iken listede 40.000 yazıyordu).
 */
const item = (recorded: unknown) => ({
  id: 'i1',
  product_id: 'p1',
  quantity: 1,
  supplier_unit_price: 20000,
  custom_description: 'kapılar cam olsun',
  price_difference: 5000,
  product_snapshot: { name: 'Largo Köşe Takımı', code: 'LRG' },
  order_item_retail_prices: recorded,
  products: { retail_prices: [{ retail_price: 40000 }] },
});

describe('kayıtlı perakende fiyatı iki gömme biçiminde de okunur', () => {
  test('dizi olarak geldiğinde', () => {
    const r = toItem(item([{ retail_unit_price: 45000 }]), true);
    expect(r.supplierUnitPrice).toBe(45000);
    expect(r.totalPrice).toBe(45000);
  });

  test('NESNE olarak geldiğinde', () => {
    const r = toItem(item({ retail_unit_price: 45000 }), true);
    expect(r.supplierUnitPrice).toBe(45000);
    expect(r.totalPrice).toBe(45000);
  });

  test('kayıt yoksa ürünün güncel perakende fiyatına düşülür', () => {
    expect(toItem(item(null), true).supplierUnitPrice).toBe(40000);
  });

  test('üretici görünümünde perakende fiyatı hiç kullanılmaz (A4)', () => {
    expect(toItem(item({ retail_unit_price: 45000 }), false).supplierUnitPrice).toBe(20000);
  });

  test('fark kırılım olarak taşınır, fiyata tekrar eklenmez', () => {
    const r = toItem(item({ retail_unit_price: 45000 }), true);
    expect(r.priceDifference).toBe(5000);
    expect(r.supplierUnitPrice).toBe(45000);
  });
});

describe('liste tutarı perakendecide KATMAN 3 toplamıdır', () => {
  const order = (recorded: unknown) => ({
    id: 'o1',
    order_no: '260814-0003',
    status: 'pending',
    total_amount: 25000,
    created_at: '2026-08-14T06:32:43Z',
    manufacturer_org_id: 'm1',
    retailer_org_id: 'r1',
    relationship_id: 'rel1',
    manufacturer: { company_name: 'kenan mobilya' },
    order_items: [item(recorded)],
  });

  test('nesne gömmede de üretici borcu değil müşteri tutarı gösterilir', () => {
    expect(toRow(order({ retail_unit_price: 45000 }), 'r1').totalAmount).toBe(45000);
  });

  test('üretici kendi listesinde KATMAN 2 toplamını görür', () => {
    expect(toRow(order({ retail_unit_price: 45000 }), 'm1').totalAmount).toBe(25000);
  });
});
