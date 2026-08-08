import { describe, expect, test } from 'vitest';
import { createOrgSchema } from './orgSchema';

const VKN = '1234567890';
const TCKN = '10000000146';

describe('createOrgSchema', () => {
  test('firma adı ve geçerli VKN yeterli', () => {
    expect(createOrgSchema.safeParse({ companyName: 'Şahin Mobilya', vknTc: VKN }).success).toBe(
      true,
    );
  });

  test('TCKN de kabul edilir (şahıs firması)', () => {
    expect(createOrgSchema.safeParse({ companyName: 'Ali Usta', vknTc: TCKN }).success).toBe(true);
  });

  test('format hatalı numara reddedilir', () => {
    // Artık yalnız format kontrolü yapılıyor; 10 hane dışı sayılar reddedilir.
    expect(createOrgSchema.safeParse({ companyName: 'X Ltd', vknTc: '111111111' }).success).toBe(
      false,  // 9 hane
    );
  });

  test('çok kısa firma adı reddedilir', () => {
    expect(createOrgSchema.safeParse({ companyName: 'A', vknTc: VKN }).success).toBe(false);
  });

  test('VKN normalize edilir', () => {
    const r = createOrgSchema.safeParse({ companyName: 'X Ltd', vknTc: ' 123-456 7890 ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.vknTc).toBe(VKN);
  });

  test('boş isteğe bağlı alanlar undefined olur', () => {
    const r = createOrgSchema.safeParse({ companyName: 'X Ltd', vknTc: VKN, email: '', phone: '' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBeUndefined();
      expect(r.data.phone).toBeUndefined();
    }
  });

  test('geçersiz e-posta reddedilir', () => {
    expect(
      createOrgSchema.safeParse({ companyName: 'X Ltd', vknTc: VKN, email: 'abc' }).success,
    ).toBe(false);
  });
});
