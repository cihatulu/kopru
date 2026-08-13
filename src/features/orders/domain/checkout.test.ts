import { describe, expect, test } from 'vitest';
import { manufacturersInCart, resolveCartTarget, type CartSupplier } from './checkout';
import type { CartLine } from './cart';

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: 'p1',
  manufacturerOrgId: 'm-cihat',
  name: 'Pierro Masa',
  code: 'Pierro',
  supplierUnitPrice: 20000,
  unitPrice: 40000,
  quantity: 1,
  ...over,
});

const SUPPLIERS: CartSupplier[] = [
  { id: 'rel-kenan', manufacturerOrgId: 'm-kenan', companyName: 'kenan mobilya' },
  { id: 'rel-cihat', manufacturerOrgId: 'm-cihat', companyName: 'cihat mobilya' },
];

describe('manufacturersInCart', () => {
  test('tekilleştirir', () => {
    expect(manufacturersInCart([line(), line({ productId: 'p2' })])).toEqual(['m-cihat']);
  });
});

describe('resolveCartTarget', () => {
  test('LİSTEDEKİ SIRAYA DEĞİL, ürünün üreticisine göre ilişki seçer', () => {
    // Asıl hata buydu: ekran her zaman ilk tedarikçiyi (kenan) kullanıyordu.
    const out = resolveCartTarget([line()], SUPPLIERS);
    expect(out).toEqual({
      ok: true,
      relationshipId: 'rel-cihat',
      supplier: SUPPLIERS[1],
    });
  });

  test('diğer üreticinin ürününde diğer ilişkiyi seçer', () => {
    const out = resolveCartTarget([line({ manufacturerOrgId: 'm-kenan' })], SUPPLIERS);
    expect(out.ok && out.relationshipId).toBe('rel-kenan');
  });

  test('boş sepet reddedilir', () => {
    expect(resolveCartTarget([], SUPPLIERS)).toEqual({ ok: false, error: 'Sepetiniz boş.' });
  });

  test('iki üretici karışmışsa sipariş verilmez', () => {
    const out = resolveCartTarget([line(), line({ manufacturerOrgId: 'm-kenan' })], SUPPLIERS);
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toMatch(/birden fazla üreticinin/);
    expect(out.ok === false && out.error).toContain('cihat mobilya');
    expect(out.ok === false && out.error).toContain('kenan mobilya');
  });

  test('ilişki yoksa anlamlı hata döner', () => {
    const out = resolveCartTarget([line({ manufacturerOrgId: 'm-yok' })], SUPPLIERS);
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toMatch(/aktif bir tedarikçi ilişkiniz/);
  });

  test('üreticisi boş kalan eski sepet satırları için uyarı verir', () => {
    const out = resolveCartTarget([line({ manufacturerOrgId: '' })], SUPPLIERS);
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toMatch(/üreticisi belirlenemedi/);
  });
});
