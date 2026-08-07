import { describe, expect, test } from 'vitest';
import {
  FINANCE_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  affectsOwnCash,
  financeTotals,
  type PaymentMethod,
} from './finance';

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
