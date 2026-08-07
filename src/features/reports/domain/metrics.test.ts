import { describe, expect, test } from 'vitest';
import { averageOrder, manufacturerMargin, retailerProfit } from './metrics';

describe('manufacturerMargin', () => {
  test('kâr ve marj hesaplanır', () => {
    expect(manufacturerMargin(10000, 6000)).toEqual({ profit: 4000, percent: 40 });
  });

  test('maliyet girilmemişse marj null', () => {
    // 0 maliyet %100 marj gösterirdi — "bilmiyorum" ile "sıfır" farklıdır.
    expect(manufacturerMargin(10000, 0).percent).toBeNull();
    expect(manufacturerMargin(10000, 0).profit).toBe(10000);
  });

  test('ciro yoksa marj null', () => {
    expect(manufacturerMargin(0, 0).percent).toBeNull();
  });

  test('zarar durumunda negatif kâr', () => {
    expect(manufacturerMargin(1000, 1500).profit).toBe(-500);
  });
});

describe('retailerProfit', () => {
  test('beklenen kâr ve oran', () => {
    expect(retailerProfit(9000, 15000)).toEqual({ profit: 6000, percent: 40 });
  });

  test('satış fiyatı girilmemişse hesaplanamaz', () => {
    expect(retailerProfit(9000, 0)).toEqual({ profit: 0, percent: null });
  });
});

describe('averageOrder', () => {
  test('ortalama hesaplanır', () => {
    expect(averageOrder(45000, 3)).toBe(15000);
  });

  test('sıfır siparişte sıfır', () => {
    expect(averageOrder(0, 0)).toBe(0);
  });

  test('kuruşa yuvarlar', () => {
    expect(averageOrder(1000, 3)).toBe(333.33);
  });
});
