import { describe, expect, test } from 'vitest';
import { acceptInviteSchema, conflictsWithInviter, createInviteSchema } from './inviteSchema';

const VKN = '1234567890';

describe('createInviteSchema', () => {
  test('hiçbir alan zorunlu değil — boş davet geçerlidir', () => {
    const r = createInviteSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.validDays).toBe(14);
      expect(r.data.discountRate).toBe(0);
      expect(r.data.vknTc).toBeUndefined();
    }
  });

  test('VKN verilirse normalize edilir', () => {
    const r = createInviteSchema.safeParse({ vknTc: ' 123-456 7890 ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.vknTc).toBe(VKN);
  });

  test('geçersiz VKN reddedilir', () => {
    expect(createInviteSchema.safeParse({ vknTc: '111111111' }).success).toBe(false); // 9 hane
  });

  test('boş VKN dizesi "geçersiz" değil, "verilmemiş" sayılır', () => {
    const r = createInviteSchema.safeParse({ vknTc: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.vknTc).toBeUndefined();
  });

  test('geçerlilik süresi 1-90 gün arasında sınırlanır', () => {
    expect(createInviteSchema.safeParse({ validDays: 0 }).success).toBe(false);
    expect(createInviteSchema.safeParse({ validDays: 91 }).success).toBe(false);
    expect(createInviteSchema.safeParse({ validDays: 90 }).success).toBe(true);
  });

  test('iskonto 0-100 aralığında', () => {
    expect(createInviteSchema.safeParse({ discountRate: 101 }).success).toBe(false);
    expect(createInviteSchema.safeParse({ discountRate: 12.5 }).success).toBe(true);
  });

  test('geçersiz e-posta reddedilir', () => {
    expect(createInviteSchema.safeParse({ email: 'abc' }).success).toBe(false);
  });
});

describe('acceptInviteSchema', () => {
  const valid = {
    vknTc: VKN,
    companyName: 'Ege Mobilya',
    password: 'sifre123',
    passwordRepeat: 'sifre123',
  };

  test('geçerli kayıt kabul edilir', () => {
    expect(acceptInviteSchema.safeParse(valid).success).toBe(true);
  });

  test('şifreler eşleşmezse reddedilir', () => {
    const r = acceptInviteSchema.safeParse({ ...valid, passwordRepeat: 'baska123' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['passwordRepeat']);
  });

  test('yalnız harften oluşan şifre reddedilir', () => {
    // Sunucu da aynı kuralı uygular; buradaki kontrol yalnız erken uyarıdır.
    expect(
      acceptInviteSchema.safeParse({ ...valid, password: 'sifresifre', passwordRepeat: 'sifresifre' })
        .success,
    ).toBe(false);
  });

  test('kısa şifre reddedilir', () => {
    expect(acceptInviteSchema.safeParse({ ...valid, password: 'ab1', passwordRepeat: 'ab1' }).success)
      .toBe(false);
  });

  test('firma adı zorunlu', () => {
    expect(acceptInviteSchema.safeParse({ ...valid, companyName: 'A' }).success).toBe(false);
  });

  test('VKN normalize edilir', () => {
    const r = acceptInviteSchema.safeParse({ ...valid, vknTc: '123-456 7890' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.vknTc).toBe(VKN);
  });
});

describe('conflictsWithInviter', () => {
  test('daveti gönderenin numarası girilemez', () => {
    expect(conflictsWithInviter(' 123-456-7890 ', VKN)).toBe(true);
  });

  test('farklı numara sorun değil', () => {
    expect(conflictsWithInviter('0123456789', VKN)).toBe(false);
  });

  test('gönderenin numarası bilinmiyorsa çakışma iddia edilmez', () => {
    expect(conflictsWithInviter(VKN, null)).toBe(false);
  });
});
