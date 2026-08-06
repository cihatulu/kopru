import { describe, expect, test } from 'vitest';
import { guestSchema, schemaFor, sponsorConflict, subscriberSchema } from './loginSchema';
import { MODES, PORTALS, modesFor, portalTitle } from './portals';

// Gerçek checksum'ı geçen test değerleri (bkz. src/lib/tckn.test.ts).
const VKN = '1234567890';
const VKN2 = '0123456789';
const TCKN = '10000000146';

describe('subscriberSchema', () => {
  test('geçerli VKN + şifre kabul edilir', () => {
    expect(subscriberSchema.safeParse({ userCode: VKN, password: 'sifre123' }).success).toBe(true);
  });

  test('TCKN de kullanıcı kodu olabilir', () => {
    expect(subscriberSchema.safeParse({ userCode: TCKN, password: 'sifre123' }).success).toBe(true);
  });

  test('checksum tutmayan kod reddedilir', () => {
    expect(subscriberSchema.safeParse({ userCode: '1111111111', password: 'sifre123' }).success)
      .toBe(false);
  });

  test('kısa şifre reddedilir', () => {
    expect(subscriberSchema.safeParse({ userCode: VKN, password: 'kisa' }).success).toBe(false);
  });

  test('boşluk ve tire normalize edilir', () => {
    const r = subscriberSchema.safeParse({ userCode: ' 123-456 7890 ', password: 'sifre123' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.userCode).toBe(VKN);
  });
});

describe('guestSchema', () => {
  test('sponsor VKN olmadan reddedilir', () => {
    expect(guestSchema.safeParse({ userCode: VKN, password: 'sifre123' }).success).toBe(false);
  });

  test('geçerli sponsor VKN ile kabul edilir', () => {
    expect(
      guestSchema.safeParse({ userCode: VKN, sponsorVkn: VKN2, password: 'sifre123' }).success,
    ).toBe(true);
  });

  test('geçersiz sponsor VKN reddedilir', () => {
    expect(
      guestSchema.safeParse({ userCode: VKN, sponsorVkn: '9999999999', password: 'sifre123' })
        .success,
    ).toBe(false);
  });
});

describe('schemaFor', () => {
  test('misafir modu sponsor VKN ister', () => {
    expect(schemaFor('manufacturer', 'guest').safeParse({ userCode: VKN, password: 'sifre123' }).success)
      .toBe(false);
  });

  test('abone modu sponsor VKN istemez', () => {
    expect(
      schemaFor('retailer', 'subscriber').safeParse({ userCode: VKN, password: 'sifre123' }).success,
    ).toBe(true);
  });

  test('admin e-posta ister, VKN değil', () => {
    // Platform admini bir org'a bağlı değildir; vergi numarası ile tanımlanmaz.
    expect(schemaFor('admin', 'subscriber').safeParse({ userCode: VKN, password: 'sifre123' }).success)
      .toBe(false);
    expect(
      schemaFor('admin', 'subscriber').safeParse({ email: 'ekip@kopru.com', password: 'sifre123' })
        .success,
    ).toBe(true);
  });
});

describe('sponsorConflict', () => {
  test('kendi VKN si ile sponsorunki aynıysa çakışma', () => {
    expect(sponsorConflict({ userCode: VKN, sponsorVkn: ' 123-456-7890 ' })).toBe(true);
  });

  test('farklıysa çakışma yok', () => {
    expect(sponsorConflict({ userCode: VKN, sponsorVkn: VKN2 })).toBe(false);
  });

  test('sponsor yoksa çakışma yok', () => {
    expect(sponsorConflict({ userCode: VKN })).toBe(false);
  });
});

describe('portals', () => {
  test('açılışta tam üç portal butonu vardır', () => {
    expect(PORTALS.map((p) => p.id)).toEqual(['manufacturer', 'retailer', 'admin']);
  });

  test('üretici ve perakendecinin ikişer giriş yolu vardır', () => {
    expect(modesFor('manufacturer').map((m) => m.id)).toEqual(['subscriber', 'guest']);
    expect(modesFor('retailer').map((m) => m.id)).toEqual(['subscriber', 'guest']);
  });

  test('adminin mod seçimi yoktur', () => {
    expect(modesFor('admin')).toEqual([]);
  });

  test('misafir modu sponsor etiketi taşır, abone modu taşımaz', () => {
    for (const kind of ['manufacturer', 'retailer'] as const) {
      const [subscriber, guest] = MODES[kind];
      expect(subscriber!.sponsorLabel).toBeUndefined();
      expect(guest!.sponsorLabel).toBeTruthy();
    }
  });

  test('üreticinin sponsoru perakendeci, perakendecininki üreticidir', () => {
    expect(MODES.manufacturer[1]!.sponsorLabel).toContain('perakendeci');
    expect(MODES.retailer[1]!.sponsorLabel).toContain('üretici');
  });

  test('portalTitle bilinen portal için başlık döner', () => {
    expect(portalTitle('manufacturer')).toBe('Üretici Üye Girişi');
    expect(portalTitle('admin')).toBe('Admin');
  });
});
