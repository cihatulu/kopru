import { describe, expect, test } from 'vitest';
import { discountedPrice, marginPercent, productSchema } from './productSchema';

const base = { name: 'Üçlü Koltuk', code: 'KOLTUK-01', supplierPrice: 10000 };

describe('productSchema', () => {
  test('ad, kod ve satış fiyatı yeterli', () => {
    expect(productSchema.safeParse(base).success).toBe(true);
  });

  test('maliyet isteğe bağlıdır ve boş bırakılabilir', () => {
    const r = productSchema.safeParse({ ...base, costPrice: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.costPrice).toBeUndefined();
  });

  test('maliyet satış fiyatını geçemez', () => {
    expect(productSchema.safeParse({ ...base, costPrice: 12000 }).success).toBe(false);
  });

  test('maliyet satış fiyatına eşit olabilir (sıfır marj)', () => {
    expect(productSchema.safeParse({ ...base, costPrice: 10000 }).success).toBe(true);
  });

  test('negatif fiyat reddedilir', () => {
    expect(productSchema.safeParse({ ...base, supplierPrice: -1 }).success).toBe(false);
  });

  test('geçerli kod biçimleri kabul edilir', () => {
    for (const code of ['A1', 'KOLTUK-01', 'SET.2/B', 'x_y', 'KOD 01', 'Zümrüt Şifonyer', 'MODEL #123']) {
      expect(productSchema.safeParse({ ...base, code }).success, code).toBe(true);
    }
  });

  test('çok kısa ad reddedilir', () => {
    expect(productSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });
});

describe('marginPercent', () => {
  test('marjı yüzde olarak verir', () => {
    expect(marginPercent(10000, 6000)).toBe(40);
    expect(marginPercent(1000, 750)).toBe(25);
  });

  test('maliyet bilinmiyorsa null', () => {
    // "Bilmiyorum" ile "sıfır" farklıdır; sıfır marj göstermek yanıltıcı olurdu.
    expect(marginPercent(10000, undefined)).toBeNull();
  });

  test('sıfır satış fiyatında null', () => {
    expect(marginPercent(0, 0)).toBeNull();
  });
});

describe('discountedPrice', () => {
  test('place_order_atomic ile aynı sonucu verir', () => {
    // Canlı doğrulamada 10000 @ %10 -> 9000 yazılmıştı.
    expect(discountedPrice(10000, 10)).toBe(9000);
  });

  test('iskonto yoksa fiyat değişmez', () => {
    expect(discountedPrice(1234.56, 0)).toBe(1234.56);
  });

  test('kuruşa yuvarlar', () => {
    expect(discountedPrice(99.99, 33)).toBe(66.99);
  });
});
