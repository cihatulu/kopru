import { describe, expect, test } from 'vitest';
import {
  addLine,
  cartManufacturerName,
  cartManufacturerOrgId,
  cartTotals,
  conflictsWithCart,
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
  supplierUnitPrice: 6000,
  unitPrice: 9000,
  quantity: 2,
  ...over,
});

describe('sepet üretici bazlıdır', () => {
  test('boş sepetin üreticisi yoktur, her ürün eklenebilir', () => {
    expect(cartManufacturerOrgId([])).toBeNull();
    expect(conflictsWithCart([], line())).toBe(false);
  });

  test('aynı üreticinin ürünü çakışmaz', () => {
    expect(conflictsWithCart([line()], line({ productId: 'p2' }))).toBe(false);
  });

  test('farklı üreticinin ürünü EKLEME ANINDA çakışır', () => {
    // Eskiden yalnız sipariş anında yakalanıyordu; kullanıcı sepeti
    // doldurduktan sonra reddediliyordu.
    expect(conflictsWithCart([line()], line({ productId: 'p2', manufacturerOrgId: 'm2' }))).toBe(
      true,
    );
  });

  test('üretici adı gösterilebilir, yoksa jenerik metne düşer', () => {
    expect(cartManufacturerName([line({ manufacturerName: 'kenan mobilya' })])).toBe('kenan mobilya');
    expect(cartManufacturerName([line()])).toBe('başka bir üretici');
    expect(cartManufacturerName([])).toBe('başka bir üretici');
  });
});

describe('özel talep fiyat farkı', () => {
  test('fark ÜRETİCİ toplamına girer — işi üretici yapar, ücreti o ister', () => {
    const l = line({ supplierUnitPrice: 20000, unitPrice: 40000, quantity: 1, priceDifference: 3000 });
    expect(cartTotals([l]).supplierTotal).toBe(23000);
  });

  test('fark perakende toplamına da yansır; kâr değişmez', () => {
    const l = line({ supplierUnitPrice: 20000, unitPrice: 40000, quantity: 1, priceDifference: 3000 });
    const t = cartTotals([l]);
    expect(t.retailTotal).toBe(43000);
    // Fark aradan geçer: perakendeci ek ücreti öder ve müşterisinden alır.
    expect(t.expectedProfit).toBe(20000);
  });

  test('fark birim başınadır, adetle çarpılır', () => {
    const l = line({ supplierUnitPrice: 20000, unitPrice: 40000, quantity: 2, priceDifference: 3000 });
    expect(cartTotals([l]).supplierTotal).toBe(46000);
  });

  test('eksi fark indirimdir', () => {
    // "kırlent istemiyoruz" — talep maliyeti düşürür.
    const l = line({ supplierUnitPrice: 20000, unitPrice: 40000, quantity: 1, priceDifference: -2000 });
    expect(cartTotals([l]).supplierTotal).toBe(18000);
  });

  test('eksi fark RPC yüküne girer, sıfır girmez', () => {
    // -500 JavaScript'te truthy; yükten düşen yalnız 0 olmalı. Eksi fark
    // sessizce yutulsaydı indirim cariye hiç yansımazdı.
    expect(toOrderItems([line({ priceDifference: -500 })])[0]).toHaveProperty(
      'price_difference',
      -500,
    );
    expect(toOrderItems([line({ priceDifference: 0 })])[0]).not.toHaveProperty('price_difference');
  });

  test('RPC yüküne giden perakende fiyat HER ŞEY DAHİLDİR', () => {
    // Asıl hata: fark KATMAN 2'ye taşınırken sunucudaki toplama kaldırıldı,
    // istemci devralmadı. Sipariş üreticiye 25.000 borç yazarken müşteri
    // tarafı 40.000 kalıyordu — takip sayfası, müşteri carisi ve sipariş
    // listesi farkı topluca yutuyordu.
    const l = line({ supplierUnitPrice: 20000, unitPrice: 40000, quantity: 1, priceDifference: 5000 });
    expect(toOrderItems([l])[0]).toMatchObject({
      retail_unit_price: 45000,
      price_difference: 5000,
    });
  });

  test('perakendeci kendi satış fiyatını yazdıysa fark onun üstüne biner', () => {
    const l = line({ retailPrice: 50000, priceDifference: 5000 });
    expect(toOrderItems([l])[0]).toHaveProperty('retail_unit_price', 55000);
  });

  test('eksi fark perakende fiyatı da düşürür', () => {
    const l = line({ unitPrice: 40000, priceDifference: -2000 });
    expect(toOrderItems([l])[0]).toHaveProperty('retail_unit_price', 38000);
  });
});

describe('lineTotal', () => {
  test('birim × adet, kuruşa yuvarlanır', () => {
    expect(lineTotal(line())).toBe(18000);
    expect(lineTotal(line({ unitPrice: 33.333, quantity: 3 }))).toBe(100);
  });
});

describe('cartTotals', () => {
  test('CARİ toplamı üretici fiyatından çıkar, ekranda görünenden DEĞİL', () => {
    // Asıl hata buydu: sepet perakende fiyatı toplayıp cari tutar diye
    // gösteriyordu (₺240.000 yazarken cariye ₺120.000 yazılıyordu).
    const t = cartTotals([line()]);
    expect(t.supplierTotal).toBe(12000); // 6000 × 2
    expect(t.retailTotal).toBe(18000); // 9000 × 2
    expect(t.expectedProfit).toBe(6000);
  });

  test('birden fazla satır toplanır', () => {
    const t = cartTotals([
      line(),
      line({ productId: 'p2', supplierUnitPrice: 250, unitPrice: 500, quantity: 4 }),
    ]);
    expect(t.supplierTotal).toBe(13000);
    expect(t.retailTotal).toBe(20000);
    expect(t.lineCount).toBe(2);
    expect(t.itemCount).toBe(6);
  });

  test('fiyat farkı HER İKİ tarafı da etkiler', () => {
    // Özel talebi üretici üretir ve ek ücreti üretici ister; perakendeci de
    // bunu satış fiyatına yansıtır. Fark aradan geçer, kâra dokunmaz.
    const t = cartTotals([line({ priceDifference: 1000 })]);
    expect(t.supplierTotal).toBe(14000);
    expect(t.retailTotal).toBe(20000);
    expect(t.expectedProfit).toBe(6000);
  });

  test('boş sepette toplamlar sıfır', () => {
    const t = cartTotals([]);
    expect(t.supplierTotal).toBe(0);
    expect(t.retailTotal).toBe(0);
    expect(t.expectedProfit).toBe(0);
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
