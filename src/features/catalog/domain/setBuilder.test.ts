import { describe, expect, test } from 'vitest';
import {
  canBuildSet,
  composeSetDescription,
  clampQuantity,
  describeSet,
  suggestedCost,
  suggestedPrice,
  type SetLineInput,
} from './setBuilder';

const line = (over: Partial<SetLineInput> = {}): SetLineInput => ({
  productId: 'p1',
  name: 'Alanya Köşe Koltuk',
  unitPrice: 10000,
  unitCost: 6000,
  quantity: 1,
  ...over,
});

describe('suggestedPrice', () => {
  test('adet × fiyat toplamı', () => {
    expect(suggestedPrice([line({ quantity: 2 }), line({ unitPrice: 5000, quantity: 1 })])).toBe(
      25000,
    );
  });

  test('boş takım sıfır', () => {
    expect(suggestedPrice([])).toBe(0);
  });
});

describe('suggestedCost', () => {
  test('tüm maliyetler biliniyorsa toplanır', () => {
    expect(suggestedCost([line({ quantity: 2 }), line({ unitCost: 1000 })])).toBe(13000);
  });

  test('BİR kalemin maliyeti bilinmiyorsa toplam da bilinmez', () => {
    // Eksik toplamı "maliyet" diye sunmak marjı olduğundan yüksek gösterirdi.
    expect(suggestedCost([line(), line({ unitCost: undefined })])).toBeNull();
  });

  test('boş takımın maliyeti sıfırdır', () => {
    expect(suggestedCost([])).toBe(0);
  });
});

describe('canBuildSet', () => {
  test('en az iki kalem gerekir', () => {
    expect(canBuildSet([line()])).toBe(false);
    expect(canBuildSet([line(), line({ productId: 'p2' })])).toBe(true);
  });

  test('miktarı sıfırlanan kalem sayılmaz', () => {
    expect(canBuildSet([line(), line({ productId: 'p2', quantity: 0 })])).toBe(false);
  });
});

describe('describeSet', () => {
  test('kalemleri okunur biçimde listeler', () => {
    expect(
      describeSet([
        line({ quantity: 2, name: 'Koltuk' }),
        line({ productId: 'p2', quantity: 1, name: 'Sehpa' }),
      ]),
    ).toBe('2 × Koltuk, 1 × Sehpa');
  });

  test('miktarı sıfır olan kalem açıklamaya girmez', () => {
    expect(describeSet([line({ name: 'Koltuk' }), line({ name: 'Sehpa', quantity: 0 })])).toBe(
      '1 × Koltuk',
    );
  });
});

describe('clampQuantity', () => {
  test('negatif sıfıra çekilir', () => {
    expect(clampQuantity(-3)).toBe(0);
  });

  test('ondalık aşağı yuvarlanır', () => {
    expect(clampQuantity(2.9)).toBe(2);
  });

  test('geçersiz sayı 1 olur', () => {
    expect(clampQuantity(Number.NaN)).toBe(1);
  });
});

describe('composeSetDescription', () => {
  const koltuk = line({ name: 'Koltuk', description: 'Gürgen iskelet, kadife kumaş.' });
  const sehpa = line({
    productId: 'p2',
    name: 'Sehpa',
    description: 'Mermer tabla, metal ayak.',
  });

  test('içerik listesi ile ürün açıklamalarını birleştirir', () => {
    const out = composeSetDescription([koltuk, sehpa]);
    expect(out).toContain('1 × Koltuk, 1 × Sehpa');
    expect(out).toContain('Koltuk: Gürgen iskelet, kadife kumaş.');
    expect(out).toContain('Sehpa: Mermer tabla, metal ayak.');
  });

  test('açıklaması olmayan ürün atlanır ama içerikte kalır', () => {
    const out = composeSetDescription([koltuk, line({ productId: 'p3', name: 'Puf' })]);
    expect(out).toContain('1 × Koltuk, 1 × Puf');
    expect(out).not.toContain('Puf:');
  });

  test('hiç açıklama yoksa yalnız içerik listesi döner', () => {
    const out = composeSetDescription([
      line({ name: 'A', description: null }),
      line({ productId: 'p2', name: 'B', description: '' }),
    ]);
    expect(out).toBe('1 × A, 1 × B');
  });

  test('miktarı sıfır olan ürün hiç girmez', () => {
    const out = composeSetDescription([koltuk, line({ ...sehpa, quantity: 0 })]);
    expect(out).not.toContain('Sehpa');
  });

  test('boş takım boş metin döner', () => {
    expect(composeSetDescription([])).toBe('');
  });
});
