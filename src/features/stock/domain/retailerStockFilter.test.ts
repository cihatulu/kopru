import { describe, expect, test } from 'vitest';
import {
  EMPTY_STOCK_FILTERS,
  dimensionsText,
  filterStockRows,
  isStockFilterActive,
  type FilterableStockRow,
} from './retailerStockFilter';

const row = (over: Partial<FilterableStockRow> = {}): FilterableStockRow => ({
  manufacturerName: 'Kenan Mobilya',
  category: 'Koltuk',
  code: 'LRG-1',
  name: 'Largo Köşe Takımı',
  widthCm: 180,
  depthCm: 90,
  heightCm: 75,
  ...over,
});

describe('dimensionsText', () => {
  test('eksik ölçüler tire ile gösterilir', () => {
    expect(dimensionsText(row({ depthCm: null }))).toBe('180 x - x 75');
  });

  test('hiç ölçü yoksa boş döner', () => {
    expect(dimensionsText(row({ widthCm: null, depthCm: null, heightCm: null }))).toBe('');
  });
});

describe('filterStockRows', () => {
  const rows = [
    row(),
    row({ manufacturerName: 'Cihat Mobilya', name: 'Havana Köşe', code: 'HVN-2', category: null }),
  ];

  test('boş süzgeç herkesi geçirir', () => {
    expect(filterStockRows(rows, EMPTY_STOCK_FILTERS)).toHaveLength(2);
  });

  test('dolu süzgeçlerin HEPSİ tutmalıdır', () => {
    const hit = filterStockRows(rows, {
      ...EMPTY_STOCK_FILTERS,
      manufacturer: 'kenan',
      name: 'largo',
    });
    expect(hit).toHaveLength(1);
    expect(hit[0]?.code).toBe('LRG-1');

    // İki süzgeç farklı satırları işaret ediyor: sonuç boş olmalı.
    expect(
      filterStockRows(rows, { ...EMPTY_STOCK_FILTERS, manufacturer: 'kenan', name: 'havana' }),
    ).toHaveLength(0);
  });

  test('Türkçe büyük/küçük harf: I ve İ doğru eşleşir', () => {
    // toLowerCase() ile 'CİHAT' -> 'ci̇hat' olur ve 'cihat' ile eşleşmezdi.
    const hit = filterStockRows(rows, { ...EMPTY_STOCK_FILTERS, manufacturer: 'CİHAT' });
    expect(hit).toHaveLength(1);
    expect(hit[0]?.name).toBe('Havana Köşe');
  });

  test('kategorisi olmayan satır kategori süzgecine takılır', () => {
    const hit = filterStockRows(rows, { ...EMPTY_STOCK_FILTERS, category: 'koltuk' });
    expect(hit).toHaveLength(1);
  });

  test('ölçü süzgeci ekranda görünen metin üzerinde çalışır', () => {
    expect(filterStockRows(rows, { ...EMPTY_STOCK_FILTERS, dimensions: '180 x 90' })).toHaveLength(2);
  });
});

describe('isStockFilterActive', () => {
  test('boş süzgeç etkin değildir', () => {
    expect(isStockFilterActive(EMPTY_STOCK_FILTERS)).toBe(false);
    expect(isStockFilterActive({ ...EMPTY_STOCK_FILTERS, name: '   ' })).toBe(false);
  });

  test('tek dolu alan yeter', () => {
    expect(isStockFilterActive({ ...EMPTY_STOCK_FILTERS, code: 'LRG' })).toBe(true);
  });
});
