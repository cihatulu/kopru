import { describe, expect, test } from 'vitest';
import {
  FINANCE_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  affectsOwnCash,
  financeTotals,
  orderRetailTotal,
  type PaymentMethod,
} from './finance';

describe('orderRetailTotal', () => {
  const line = (qty: number, supplier: number, retail: number | null) => ({
    quantity: qty,
    supplier_unit_price: supplier,
    order_item_retail_prices: retail === null ? [] : [{ retail_unit_price: retail }],
  });

  test('müşteri borcu KATMAN 3 ten kurulur, üretici fiyatından değil', () => {
    // Gerçek vaka: 3 kalem × 20.000 üretici / 40.000 perakende.
    const items = [line(1, 20000, 40000), line(1, 20000, 40000), line(1, 20000, 40000)];
    expect(orderRetailTotal(items, 60000)).toBe(120000);
  });

  test('satış fiyatı kayıtlı değilse üretici fiyatına düşülür', () => {
    expect(orderRetailTotal([line(2, 1500, null)], 3000)).toBe(3000);
  });

  test('bire bir bağ nesne olarak da gelebilir', () => {
    const items = [{ quantity: 2, supplier_unit_price: 100, order_item_retail_prices: { retail_unit_price: 250 } }];
    expect(orderRetailTotal(items, 200)).toBe(500);
  });

  test('kalem okunamıyorsa üretici toplamı korunur', () => {
    expect(orderRetailTotal(undefined, 750)).toBe(750);
    expect(orderRetailTotal([], 750)).toBe(750);
  });
});

describe('financeTotals', () => {
  test('gelir, gider ve net hesaplanır', () => {
    expect(
      financeTotals([
        { kind: 'income', amount: 1000 },
        { kind: 'income', amount: 500 },
        { kind: 'expense', amount: 300 },
      ]),
    ).toEqual({ income: 1500, expense: 300, net: 1200 });
  });

  test('boş defter sıfırdır', () => {
    expect(financeTotals([])).toEqual({ income: 0, expense: 0, net: 0 });
  });

  test('gider fazlaysa net negatif', () => {
    expect(financeTotals([{ kind: 'expense', amount: 250 }]).net).toBe(-250);
  });

  test('kuruş hataları birikmez', () => {
    const t = financeTotals([
      { kind: 'income', amount: 0.1 },
      { kind: 'income', amount: 0.2 },
    ]);
    expect(t.income).toBe(0.3);
  });
});

describe('affectsOwnCash', () => {
  test('üretici POS u kendi kasasına girmez', () => {
    // Para doğrudan üreticiye gider ve cari borcu düşer; kasada göstermek
    // işletmenin nakdini olduğundan fazla gösterirdi.
    expect(affectsOwnCash('pos_manufacturer')).toBe(false);
  });

  test('diğer yöntemler kasaya girer', () => {
    for (const m of ['cash', 'pos_own', 'bank_transfer'] as PaymentMethod[]) {
      expect(affectsOwnCash(m)).toBe(true);
    }
  });
});

describe('etiketler', () => {
  test('tüm yöntem ve tiplerin Türkçe karşılığı var', () => {
    expect(Object.keys(PAYMENT_METHOD_LABELS)).toHaveLength(4);
    for (const v of Object.values(PAYMENT_METHOD_LABELS)) expect(v.length).toBeGreaterThan(0);
    for (const v of Object.values(FINANCE_KIND_LABELS)) expect(v.length).toBeGreaterThan(0);
  });
});
