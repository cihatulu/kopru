import { describe, expect, test } from 'vitest';
import { isValidTckn, isValidVkn, isValidVknTc, normalizeVknTc } from './tckn';

describe('isValidTckn — sadece format kontrolü', () => {
  test('11 hane, ilk hane 1-9 ise kabul edilir', () => {
    expect(isValidTckn('10000000146')).toBe(true);
    expect(isValidTckn('12345678901')).toBe(true);
    expect(isValidTckn('99999999999')).toBe(true);
  });

  test('ilk hane 0 olamaz', () => {
    expect(isValidTckn('01000000146')).toBe(false);
  });

  test('uzunluk 11 değilse reddedilir', () => {
    expect(isValidTckn('1000000014')).toBe(false);   // 10 hane
    expect(isValidTckn('100000001466')).toBe(false); // 12 hane
  });

  test('rakam dışı karakter reddedilir', () => {
    expect(isValidTckn('1000000014a')).toBe(false);
    expect(isValidTckn('')).toBe(false);
  });
});

describe('isValidVkn — sadece format kontrolü', () => {
  test('tam 10 rakam kabul edilir', () => {
    expect(isValidVkn('7894561234')).toBe(true); // eskiden reddediliyordu
    expect(isValidVkn('0000000000')).toBe(true);
    expect(isValidVkn('1234567890')).toBe(true);
  });

  test('uzunluk 10 değilse reddedilir', () => {
    expect(isValidVkn('123456789')).toBe(false);   // 9 hane
    expect(isValidVkn('12345678901')).toBe(false); // 11 hane
  });

  test('rakam dışı karakter reddedilir', () => {
    expect(isValidVkn('123456789x')).toBe(false);
  });
});

describe('isValidVknTc', () => {
  test('10 haneli sayı VKN olarak kabul edilir', () => {
    expect(isValidVknTc('7894561234')).toBe(true);
    expect(isValidVknTc('1234567890')).toBe(true);
  });

  test('11 haneli sayı (1-9 başlayan) TCKN olarak kabul edilir', () => {
    expect(isValidVknTc('10000000146')).toBe(true);
    expect(isValidVknTc('12345678901')).toBe(true);
  });

  test('geçersiz format reddedilir', () => {
    expect(isValidVknTc('123456789')).toBe(false);  // 9 hane
    expect(isValidVknTc('abc')).toBe(false);
    expect(isValidVknTc('')).toBe(false);
  });
});

describe('normalizeVknTc', () => {
  test('boşluk, nokta ve tire ayıklanır', () => {
    expect(normalizeVknTc(' 123 456-78.90 ')).toBe('1234567890');
  });

  test('normalize sonrası doğrulama geçer', () => {
    expect(isValidVknTc(normalizeVknTc('789-456-1234'))).toBe(true);
  });
});
