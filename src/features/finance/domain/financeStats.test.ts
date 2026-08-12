import { describe, test, expect } from 'vitest';
import { computeFinanceStats, EMPTY_FINANCE_STATS } from './financeStats';
import type { FinanceTransaction } from './finance';

const tx = (p: Partial<FinanceTransaction>): FinanceTransaction => ({
  id: 't',
  retailer_id: 'r',
  type: 'income',
  method: 'cash',
  amount: 0,
  description: null,
  order_id: null,
  manufacturer_id: null,
  created_at: '2026-08-01T00:00:00Z',
  ...p,
});

describe('computeFinanceStats', () => {
  test('veri yokken sıfır özet döner', () => {
    expect(computeFinanceStats(undefined)).toEqual(EMPTY_FINANCE_STATS);
    expect(computeFinanceStats([])).toEqual(EMPTY_FINANCE_STATS);
  });

  test('sabit boş özeti mutasyona uğratmaz', () => {
    const first = computeFinanceStats([tx({ method: 'cash', type: 'income', amount: 100 })]);
    expect(first.cash_balance).toBe(100);
    expect(EMPTY_FINANCE_STATS.cash_balance).toBe(0);
    expect(computeFinanceStats([])).toEqual(EMPTY_FINANCE_STATS);
  });

  test('nakit gelir kasayı artırır, gider azaltır', () => {
    const s = computeFinanceStats([
      tx({ method: 'cash', type: 'income', amount: 1000 }),
      tx({ method: 'cash', type: 'expense', amount: 400 }),
    ]);
    expect(s.total_cash_income).toBe(1000);
    expect(s.total_cash_expense).toBe(400);
    expect(s.cash_balance).toBe(600);
  });

  test('POS tahsilatı kasaya girmez — bankaya gider', () => {
    const s = computeFinanceStats([tx({ method: 'pos_own', type: 'income', amount: 500 })]);
    expect(s.total_pos_own).toBe(500);
    expect(s.cash_balance).toBe(0);
    expect(s.total_cash_income).toBe(0);
  });

  test('POS giderleri ilgili toplamdan düşülür', () => {
    const s = computeFinanceStats([
      tx({ method: 'pos_own', type: 'income', amount: 500 }),
      tx({ method: 'pos_own', type: 'expense', amount: 200 }),
    ]);
    expect(s.total_pos_own).toBe(300);
  });

  test('üretici POS\'u ayrı izlenir — perakendecinin parası değil', () => {
    const s = computeFinanceStats([
      tx({ method: 'pos_manufacturer', type: 'income', amount: 900 }),
    ]);
    expect(s.total_pos_manufacturer).toBe(900);
    expect(s.cash_balance).toBe(0);
    expect(s.total_pos_own).toBe(0);
  });

  test('havale/EFT hiçbir kasa toplamına yazılmaz', () => {
    const s = computeFinanceStats([
      tx({ method: 'bank_transfer', type: 'income', amount: 750 }),
    ]);
    expect(s).toEqual(EMPTY_FINANCE_STATS);
  });

  test('metin gelen tutarlar sayıya çevrilir', () => {
    const s = computeFinanceStats([
      tx({ method: 'cash', type: 'income', amount: '250.50' as unknown as number }),
    ]);
    expect(s.cash_balance).toBe(250.5);
  });
});
