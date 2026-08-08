import { describe, expect, test } from 'vitest';
import {
  canBuildSet,
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
