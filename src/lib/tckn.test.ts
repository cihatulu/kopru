import { describe, expect, test } from 'vitest';
import { isValidTckn, isValidVkn, isValidVknTc, normalizeVknTc } from './tckn';

describe('isValidTckn', () => {
  test('geçerli TCKN kabul edilir', () => {
    expect(isValidTckn('10000000146')).toBe(true);
  });

  test('son hane bozulursa reddedilir', () => {
    expect(isValidTckn('10000000147')).toBe(false);
  });

  test('10. hane (checksum) bozulursa reddedilir', () => {
    expect(isValidTckn('10000000156')).toBe(false);
  });

  test('ilk hane 0 olamaz', () => {
    expect(isValidTckn('01000000146')).toBe(false);
  });

  test('uzunluk 11 değilse reddedilir', () => {
    expect(isValidTckn('1000000014')).toBe(false);
    expect(isValidTckn('100000001466')).toBe(false);
  });

  test('rakam dışı karakter reddedilir', () => {
    expect(isValidTckn('1000000014a')).toBe(false);
    expect(isValidTckn('')).toBe(false);
  });
});

describe('isValidVkn', () => {
  test('geçerli VKN kabul edilir', () => {
    expect(isValidVkn('1234567890')).toBe(true);
  });

  test('tmp===9 dalını kullanan VKN kabul edilir', () => {
    // Her hane için (d + 9-i) % 10 === 9 olur; özel dal bu vakayla korunur.
    expect(isValidVkn('0123456789')).toBe(true);
  });

  test('checksum bozulursa reddedilir', () => {
    expect(isValidVkn('1234567891')).toBe(false);
  });

  test('uzunluk 10 değilse reddedilir', () => {
    expect(isValidVkn('123456789')).toBe(false);
    expect(isValidVkn('12345678901')).toBe(false);
  });

  test('rakam dışı karakter reddedilir', () => {
    expect(isValidVkn('123456789x')).toBe(false);
  });
});

describe('isValidVknTc', () => {
  test('her iki biçimi de kabul eder', () => {
    expect(isValidVknTc('1234567890')).toBe(true);
    expect(isValidVknTc('10000000146')).toBe(true);
  });

  test('geçersizi reddeder', () => {
    expect(isValidVknTc('1111111111')).toBe(false);
    expect(isValidVknTc('abc')).toBe(false);
  });
});

describe('normalizeVknTc', () => {
  test('boşluk, nokta ve tire ayıklanır', () => {
    expect(normalizeVknTc(' 123 456-78.90 ')).toBe('1234567890');
  });

  test('normalize sonrası doğrulama geçer', () => {
    expect(isValidVknTc(normalizeVknTc('123-456-7890'))).toBe(true);
  });
});
