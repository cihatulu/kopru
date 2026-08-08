import { describe, expect, test } from 'vitest';
import {
  EMPTY_FILTERS,
  hasActiveFilter,
  isRangeInverted,
  partyColumn,
  toDateRange,
  type ServiceFilters,
} from './filters';

const f = (over: Partial<ServiceFilters> = {}): ServiceFilters => ({ ...EMPTY_FILTERS, ...over });

describe('hasActiveFilter', () => {
  test('boş filtre etkin değildir', () => {
    expect(hasActiveFilter(EMPTY_FILTERS)).toBe(false);
  });

  test('her alan tek başına filtreyi etkinleştirir', () => {
    expect(hasActiveFilter(f({ status: 'bekliyor' }))).toBe(true);
    expect(hasActiveFilter(f({ partyOrgId: 'abc' }))).toBe(true);
    expect(hasActiveFilter(f({ from: '2026-08-01' }))).toBe(true);
    expect(hasActiveFilter(f({ to: '2026-08-31' }))).toBe(true);
  });
});

describe('toDateRange', () => {
  test('tarih yoksa sınır da yok', () => {
    expect(toDateRange(EMPTY_FILTERS)).toEqual({});
  });

  test('alt sınır günün başlangıcıdır ve DAHİLDİR', () => {
    expect(toDateRange(f({ from: '2026-08-01' })).gte).toBe('2026-08-01T00:00:00.000Z');
  });

  test('üst sınır ERTESİ günün başlangıcıdır', () => {
    // "31 Ağustos'a kadar" derken 31 Ağustos günü açılan talepler de dahildir.
    // `<= '2026-08-31'` yazsaydık o günün tamamı listeden düşerdi.
    expect(toDateRange(f({ to: '2026-08-31' })).lt).toBe('2026-09-01T00:00:00.000Z');
  });

  test('ay sonu sınırı doğru geçilir', () => {
    expect(toDateRange(f({ to: '2026-01-31' })).lt).toBe('2026-02-01T00:00:00.000Z');
  });

  test('yıl sonu sınırı doğru geçilir', () => {
    expect(toDateRange(f({ to: '2026-12-31' })).lt).toBe('2027-01-01T00:00:00.000Z');
  });

  test('artık yıl 29 Şubat doğru geçilir', () => {
    expect(toDateRange(f({ to: '2028-02-28' })).lt).toBe('2028-02-29T00:00:00.000Z');
    expect(toDateRange(f({ to: '2028-02-29' })).lt).toBe('2028-03-01T00:00:00.000Z');
  });

  test('iki sınır birlikte verilir', () => {
    const r = toDateRange(f({ from: '2026-08-01', to: '2026-08-31' }));
    expect(r).toEqual({ gte: '2026-08-01T00:00:00.000Z', lt: '2026-09-01T00:00:00.000Z' });
  });
});

describe('partyColumn', () => {
  test('üreticinin karşı tarafı perakendecidir', () => {
    expect(partyColumn('manufacturer')).toBe('retailer_org_id');
  });

  test('perakendecinin karşı tarafı üreticidir', () => {
    // Ters kolona filtre uygulamak sessizce boş liste döndürürdü.
    expect(partyColumn('retailer')).toBe('manufacturer_org_id');
  });
});

describe('isRangeInverted', () => {
  test('başlangıç bitişten sonraysa yakalanır', () => {
    expect(isRangeInverted(f({ from: '2026-08-31', to: '2026-08-01' }))).toBe(true);
  });

  test('doğru sıralı aralık sorun değil', () => {
    expect(isRangeInverted(f({ from: '2026-08-01', to: '2026-08-31' }))).toBe(false);
  });

  test('aynı gün geçerlidir', () => {
    expect(isRangeInverted(f({ from: '2026-08-01', to: '2026-08-01' }))).toBe(false);
  });

  test('tek sınır varken ters olamaz', () => {
    expect(isRangeInverted(f({ from: '2026-08-31' }))).toBe(false);
    expect(isRangeInverted(f({ to: '2026-08-01' }))).toBe(false);
  });
});
