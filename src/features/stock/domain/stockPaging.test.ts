import { describe, test, expect } from 'vitest';
import {
  clampPage,
  filterByCategory,
  pageCount,
  pageSlice,
  uniqueCategories,
} from './stockPaging';

const rows = [
  { category: 'Koltuk', id: 1 },
  { category: 'Yatak', id: 2 },
  { category: 'Koltuk', id: 3 },
  { category: null, id: 4 },
];

describe('uniqueCategories', () => {
  test('tekrarsız döner ve boşları atar', () => {
    expect(uniqueCategories(rows)).toEqual(['Koltuk', 'Yatak']);
  });

  test('boş listede boş dizi', () => {
    expect(uniqueCategories([])).toEqual([]);
  });
});

describe('filterByCategory', () => {
  test('null kategori süzmez — Tümü durumu', () => {
    expect(filterByCategory(rows, null)).toHaveLength(4);
  });

  test('seçili kategoriyi süzer', () => {
    expect(filterByCategory(rows, 'Koltuk').map((r) => r.id)).toEqual([1, 3]);
  });

  test('kategorisi olmayan satır hiçbir kategoriye düşmez', () => {
    expect(filterByCategory(rows, 'Yatak').map((r) => r.id)).toEqual([2]);
  });
});

describe('pageCount', () => {
  test('tam bölünmede fazladan sayfa üretmez', () => {
    expect(pageCount(20, 10)).toBe(2);
  });

  test('artan satır için bir sayfa daha', () => {
    expect(pageCount(21, 10)).toBe(3);
  });

  test('boş listede 0', () => {
    expect(pageCount(0, 10)).toBe(0);
  });

  test('geçersiz sayfa boyutunda 0', () => {
    expect(pageCount(10, 0)).toBe(0);
  });
});

describe('clampPage', () => {
  test('aralık içindeki sayfaya dokunmaz', () => {
    expect(clampPage(2, 3)).toBe(2);
  });

  test('üst sınırı aşan sayfa son sayfaya çekilir', () => {
    expect(clampPage(7, 3)).toBe(3);
  });

  test('sıfır ve altı ilk sayfaya çekilir', () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(-4, 3)).toBe(1);
  });

  test('hiç sayfa yoksa 1', () => {
    expect(clampPage(5, 0)).toBe(1);
  });
});

describe('pageSlice', () => {
  const many = Array.from({ length: 25 }, (_, i) => i + 1);

  test('ilk sayfa baştan diliminler', () => {
    expect(pageSlice(many, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('son sayfa eksik kalabilir', () => {
    expect(pageSlice(many, 3, 10)).toEqual([21, 22, 23, 24, 25]);
  });

  test('aralık dışı sayfada BOŞ dönmez, son sayfaya kırpılır', () => {
    expect(pageSlice(many, 99, 10)).toEqual([21, 22, 23, 24, 25]);
  });

  test('boş listede boş dizi', () => {
    expect(pageSlice([], 1, 10)).toEqual([]);
  });
});
