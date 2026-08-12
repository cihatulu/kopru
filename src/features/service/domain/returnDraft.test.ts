import { describe, expect, test } from 'vitest';
import { clampReturnQty, toReturnLines, validateReturnDraft } from './returnDraft';

describe('clampReturnQty', () => {
  test('sipariş edilen adedi aşamaz', () => {
    expect(clampReturnQty(9, 3)).toBe(3);
  });

  test('negatife düşmez', () => {
    expect(clampReturnQty(-4, 3)).toBe(0);
  });

  test('ondalık girilirse tam sayıya iner', () => {
    expect(clampReturnQty(2.7, 5)).toBe(2);
  });

  test('sayı olmayan giriş sıfır sayılır', () => {
    // Boş bırakılan number input NaN üretir.
    expect(clampReturnQty(Number.NaN, 5)).toBe(0);
  });
});

describe('toReturnLines', () => {
  test('sıfır adetli satırlar elenir', () => {
    expect(toReturnLines({ a: 2, b: 0, c: 1 })).toEqual([
      { orderItemId: 'a', quantity: 2 },
      { orderItemId: 'c', quantity: 1 },
    ]);
  });
});

describe('validateReturnDraft', () => {
  const lines = [{ orderItemId: 'a', quantity: 1 }];

  test('miktar seçilmemişse reddedilir', () => {
    expect(validateReturnDraft([], 'Hasarlı geldi')).toMatch(/en az bir ürün/);
  });

  test('neden zorunludur', () => {
    expect(validateReturnDraft(lines, '   ')).toMatch(/nedenini/);
  });

  test('geçerli taslak null döner', () => {
    expect(validateReturnDraft(lines, 'Hasarlı geldi')).toBeNull();
  });
});
