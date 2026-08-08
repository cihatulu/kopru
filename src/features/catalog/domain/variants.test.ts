import { describe, expect, test } from 'vitest';
import {
  addSetLine,
  addVariant,
  addVariantOption,
  canAddToSet,
  cleanVariants,
  formatDimensions,
  removeVariant,
  removeVariantOption,
  setLineQuantity,
  updateVariantName,
  updateVariantOption,
  type Variant,
} from './variants';

const v = (name: string, options: string[]): Variant => ({ name, options });

describe('cleanVariants', () => {
  test('geçerli varyantlar korunur', () => {
    expect(cleanVariants([v('Renk', ['Ceviz', 'Beyaz'])])).toEqual([
      { name: 'Renk', options: ['Ceviz', 'Beyaz'] },
    ]);
  });

  test('adı boş varyant atılır', () => {
    expect(cleanVariants([v('  ', ['Ceviz'])])).toEqual([]);
  });

  test('seçeneksiz varyant atılır', () => {
    expect(cleanVariants([v('Renk', ['', '  '])])).toEqual([]);
  });

  test('boşluklar kırpılır', () => {
    expect(cleanVariants([v(' Renk ', [' Ceviz '])])).toEqual([
      { name: 'Renk', options: ['Ceviz'] },
    ]);
  });
});

describe('varyant düzenleme', () => {
  test('yeni varyant boş satır olarak eklenir', () => {
    expect(addVariant([])).toEqual([{ name: '', options: [''] }]);
  });

  test('ad güncellenir', () => {
    expect(updateVariantName([v('a', ['x'])], 0, 'Renk')[0]!.name).toBe('Renk');
  });

  test('seçenek güncellenir ve eklenir', () => {
    const one = updateVariantOption([v('Renk', ['x'])], 0, 0, 'Ceviz');
    expect(one[0]!.options).toEqual(['Ceviz']);
    expect(addVariantOption(one, 0)[0]!.options).toEqual(['Ceviz', '']);
  });

  test('varyant silinir', () => {
    expect(removeVariant([v('a', ['x']), v('b', ['y'])], 0)).toHaveLength(1);
  });

  test('son seçenek silinince varyantın tamamı kalkar', () => {
    // Seçeneksiz varyant anlamsızdır; boş satır bırakmak kullanıcıyı yanıltır.
    expect(removeVariantOption([v('Renk', ['Ceviz'])], 0, 0)).toEqual([]);
  });

  test('mevcut dizi mutasyona uğramaz', () => {
    const orig = [v('Renk', ['Ceviz'])];
    updateVariantName(orig, 0, 'Kumaş');
    expect(orig[0]!.name).toBe('Renk');
  });
});

describe('set içeriği', () => {
  test('aynı ürün tekrar eklenirse adet artar', () => {
    const r = addSetLine(addSetLine([], 'p1'), 'p1');
    expect(r).toHaveLength(1);
    expect(r[0]!.quantity).toBe(2);
  });

  test('adet sıfırlanınca satır silinir', () => {
    expect(setLineQuantity([{ productId: 'p1', quantity: 3 }], 'p1', 0)).toEqual([]);
  });

  test('ürün kendi setine eklenemez', () => {
    // Aksi halde set kendini içerir; içerik hesabı sonsuz döngüye girer.
    expect(canAddToSet('p1', 'p1')).toBe(false);
    expect(canAddToSet('p2', 'p1')).toBe(true);
  });

  test('yeni üründe her ürün eklenebilir', () => {
    expect(canAddToSet('p1', undefined)).toBe(true);
  });
});

describe('formatDimensions', () => {
  test('üç ölçü birleştirilir', () => {
    expect(formatDimensions({ width: 200, depth: 90, height: 75 })).toBe('200 × 90 × 75 cm');
  });

  test('eksik ölçü tire ile gösterilir', () => {
    expect(formatDimensions({ width: 200, height: 75 })).toBe('200 × — × 75 cm');
  });

  test('hiç ölçü yoksa null', () => {
    expect(formatDimensions({})).toBeNull();
  });
});
