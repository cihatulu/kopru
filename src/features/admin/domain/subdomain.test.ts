import { describe, expect, test } from 'vitest';
import { normalizeSubdomain, suggestSubdomain, validateSubdomain } from './subdomain';

describe('suggestSubdomain', () => {
  test('Türkçe karakterleri ASCII ye çevirir', () => {
    expect(suggestSubdomain('Şahin Mobilya')).toBe('sahin-mobilya');
    expect(suggestSubdomain('Çağrı Ünlü Ltd')).toBe('cagri-unlu-ltd');
  });

  test('noktalama ve fazla boşluk tireye iner', () => {
    expect(suggestSubdomain('A.B.C.  Ticaret A.Ş.')).toBe('a-b-c-ticaret-a-s');
  });

  test('baş ve sondaki tireler kırpılır', () => {
    expect(suggestSubdomain('  -Test-  ')).toBe('test');
  });

  test('32 karakterde kesilir ve sonda tire bırakmaz', () => {
    const s = suggestSubdomain('a'.repeat(20) + ' ' + 'b'.repeat(20));
    expect(s.length).toBeLessThanOrEqual(32);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('validateSubdomain', () => {
  test('geçerli subdomain kabul edilir', () => {
    expect(validateSubdomain('sahin-mobilya')).toBeNull();
  });

  test('boş reddedilir', () => {
    expect(validateSubdomain('   ')).toBe('empty');
  });

  test('büyük harf hata değil, normalize edilir', () => {
    // Kullanıcıya "küçük harf yaz" demek gereksiz sürtünme; kaydedilen değer
    // her zaman normalizeSubdomain çıktısıdır.
    expect(validateSubdomain('Sahin-Mobilya')).toBeNull();
    expect(normalizeSubdomain('  Sahin-Mobilya  ')).toBe('sahin-mobilya');
  });

  test('alt çizgi ve geçersiz karakter reddedilir', () => {
    expect(validateSubdomain('sahin_mobilya')).toBe('format');
    expect(validateSubdomain('sahin.mobilya')).toBe('format');
    expect(validateSubdomain('şahin')).toBe('format');
  });

  test('tire ile başlayıp bitemez', () => {
    expect(validateSubdomain('-sahin')).toBe('format');
    expect(validateSubdomain('sahin-')).toBe('format');
  });

  test('çok kısa reddedilir', () => {
    expect(validateSubdomain('ab')).toBe('format');
  });

  test('rezerve isimler reddedilir', () => {
    expect(validateSubdomain('www')).toBe('reserved');
    expect(validateSubdomain('admincyo')).toBe('reserved');
  });
});
