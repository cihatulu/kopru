import { describe, expect, test } from 'vitest';
import {
  addLine,
  cartTotals,
  lineTotal,
  setQuantity,
  setRetailPrice,
  toOrderItems,
  type CartLine,
} from './cart';

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: 'p1',
  manufacturerOrgId: 'm1',
  name: 'Koltuk',
  code: 'K-1',
  unitPrice: 9000,
  quantity: 2,
  ...over,
});

describe('lineTotal', () => {
  test('birim × adet, kuruşa yuvarlanır', () => {
    expect(lineTotal(line())).toBe(18000);
    expect(lineTotal(line({ unitPrice: 33.333, quantity: 3 }))).toBe(100);
  });
});

describe('cartTotals', () => {
  test('alış toplamı — cari bu tutardan işler', () => {
    const t = cartTotals([line(), line({ productId: 'p2', unitPrice: 500, quantity: 4 })]);
    expect(t.supplierTotal).toBe(20000);
    expect(t.lineCount).toBe(2);
    expect(t.itemCount).toBe(6);
  });

  test('tüm satırlar fiyatlıysa ciro ve kâr hesaplanır', () => {
    const t = cartTotals([line({ retailPrice: 15000 })]);
    expect(t.retailTotal).toBe(30000);
    expect(t.expectedProfit).toBe(12000);
  });

  test('bir satır bile fiyatsızsa ciro ve kâr null', () => {
    // Yanıltıcı bir sayı göstermektense hiç göstermemek doğrusu.
    const t = cartTotals([line({ retailPrice: 15000 }), line({ productId: 'p2' })]);
    expect(t.retailTotal).toBeNull();
    expect(t.expectedProfit).toBeNull();
  });

  test('boş sepette ciro null, toplam sıfır', () => {
    const t = cartTotals([]);
    expect(t.supplierTotal).toBe(0);
    expect(t.retailTotal).toBeNull();
  });
});

describe('addLine', () => {
  test('yeni ürün satır olarak eklenir', () => {
    expect(addLine([line()], line({ productId: 'p2' }))).toHaveLength(2);
  });

  test('aynı ürün tekrar eklenirse miktar artar', () => {
    const r = addLine([line({ quantity: 2 })], line({ quantity: 3 }));
    expect(r).toHaveLength(1);
    expect(r[0]!.quantity).toBe(5);
  });

  test('mevcut satır mutasyona uğramaz', () => {
    const orig = [line({ quantity: 2 })];
    addLine(orig, line({ quantity: 3 }));
    expect(orig[0]!.quantity).toBe(2);
  });
});

describe('setQuantity', () => {
  test('miktar güncellenir', () => {
    expect(setQuantity([line()], 'p1', 7)[0]!.quantity).toBe(7);
  });

  test('sıfır veya altı satırı siler', () => {
    expect(setQuantity([line()], 'p1', 0)).toHaveLength(0);
    expect(setQuantity([line()], 'p1', -1)).toHaveLength(0);
  });
});

describe('setRetailPrice', () => {
  test('fiyat atanır ve kaldırılabilir', () => {
    const withPrice = setRetailPrice([line()], 'p1', 15000);
    expect(withPrice[0]!.retailPrice).toBe(15000);
    expect(setRetailPrice(withPrice, 'p1', undefined)[0]!.retailPrice).toBeUndefined();
  });
});

describe('toOrderItems', () => {
  test('RPC yükünü üretir', () => {
    expect(toOrderItems([line({ retailPrice: 15000 })])).toEqual([
      { product_id: 'p1', quantity: 2, retail_unit_price: 15000 },
    ]);
  });

  test('retailPrice belirtilmediğinde unitPrice varsayılan perakende fiyatı olarak gönderilir', () => {
    expect(toOrderItems([line()])).toEqual([
      { product_id: 'p1', quantity: 2, retail_unit_price: 9000 },
    ]);
  });
});
