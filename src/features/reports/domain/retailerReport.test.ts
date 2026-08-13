import { describe, expect, test } from 'vitest';
import {
  byManufacturer,
  bySalesperson,
  byStatus,
  kpiOf,
  rangeFor,
  type RetailerReportOrder,
} from './retailerReport';

const order = (over: Partial<RetailerReportOrder> = {}): RetailerReportOrder => ({
  id: 'o1',
  status: 'pending',
  createdAt: '2026-08-13T00:00:00Z',
  total: 1000,
  manufacturerName: 'kenan mobilya',
  salespersonId: 'u1',
  salespersonName: 'nazmiye',
  ...over,
});

describe('rangeFor', () => {
  const now = new Date(2026, 7, 13); // 13 Ağustos 2026

  test('bu ay', () => {
    expect(rangeFor('this-month', now)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  test('geçen ay', () => {
    expect(rangeFor('last-month', now)).toEqual({ start: '2026-07-01', end: '2026-07-31' });
  });

  test('bu yıl', () => {
    expect(rangeFor('this-year', now)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });

  test('ocakta geçen ay bir önceki yılın aralığıdır', () => {
    expect(rangeFor('last-month', new Date(2026, 0, 15))).toEqual({
      start: '2025-12-01',
      end: '2025-12-31',
    });
  });

  test('şubatın son günü artık yılda 29 olur', () => {
    expect(rangeFor('this-month', new Date(2028, 1, 10)).end).toBe('2028-02-29');
  });
});

describe('kpiOf', () => {
  test('toplam ve ortalama', () => {
    const k = kpiOf([order(), order({ id: 'o2', total: 3000 })]);
    expect(k).toEqual({ orderCount: 2, total: 4000, average: 2000 });
  });

  test('sipariş yokken ortalama NaN değil sıfırdır', () => {
    expect(kpiOf([])).toEqual({ orderCount: 0, total: 0, average: 0 });
  });
});

describe('byManufacturer', () => {
  test('üreticiye göre toplar ve tutara göre sıralar', () => {
    const rows = byManufacturer([
      order(),
      order({ id: 'o2', total: 500 }),
      order({ id: 'o3', manufacturerName: 'cihat mobilya', total: 5000 }),
    ]);
    expect(rows.map((r) => r.label)).toEqual(['cihat mobilya', 'kenan mobilya']);
    expect(rows[1]).toMatchObject({ orderCount: 2, total: 1500 });
  });
});

describe('bySalesperson', () => {
  test('personel bazında toplar', () => {
    const rows = bySalesperson([
      order(),
      order({ id: 'o2', salespersonId: 'u2', salespersonName: 'adnan ulu', total: 4000 }),
    ]);
    expect(rows[0]).toMatchObject({ label: 'adnan ulu', total: 4000 });
  });

  test('satışçısı olmayan eski siparişler tek grupta toplanır', () => {
    const rows = bySalesperson([
      order({ salespersonId: null, salespersonName: 'Belirtilmemiş' }),
      order({ id: 'o2', salespersonId: null, salespersonName: 'Belirtilmemiş' }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'yok', orderCount: 2 });
  });
});

describe('byStatus', () => {
  test('durum etiketi dışarıdan gelir', () => {
    const rows = byStatus([order(), order({ id: 'o2', status: 'delivered' })], (s) =>
      s === 'pending' ? 'Bekliyor' : 'Teslim Edildi',
    );
    expect(rows.map((r) => r.label).sort()).toEqual(['Bekliyor', 'Teslim Edildi']);
  });
});
