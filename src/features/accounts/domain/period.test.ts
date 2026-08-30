import { describe, expect, test } from 'vitest';
import {
  EMPTY_PERIOD,
  currentMonth,
  currentYear,
  isPeriodActive,
  isPeriodInverted,
  isSummaryConsistent,
  previousMonth,
  toBounds,
  type LedgerSummary,
} from './period';

describe('toBounds', () => {
  test('boş dönem sınırsızdır', () => {
    expect(toBounds(EMPTY_PERIOD)).toEqual({ from: null, to: null });
  });

  test('alt sınır günün başlangıcıdır ve DAHİLDİR', () => {
    expect(toBounds({ from: '2026-08-01', to: '' }).from).toBe('2026-08-01T00:00:00.000Z');
  });

  test('üst sınır ERTESİ günün başlangıcıdır', () => {
    // "31 Ağustos'a kadar" derken o gün girilen hareketler de dahildir.
    // `<= '2026-08-31'` yazsaydık o günün tamamı ekstreden düşerdi.
    expect(toBounds({ from: '', to: '2026-08-31' }).to).toBe('2026-09-01T00:00:00.000Z');
  });

  test('ay ve yıl sınırı doğru geçilir', () => {
    expect(toBounds({ from: '', to: '2026-12-31' }).to).toBe('2027-01-01T00:00:00.000Z');
    expect(toBounds({ from: '', to: '2028-02-29' }).to).toBe('2028-03-01T00:00:00.000Z');
  });
});

describe('isPeriodActive / isPeriodInverted', () => {
  test('tek sınır bile dönemi etkinleştirir', () => {
    expect(isPeriodActive(EMPTY_PERIOD)).toBe(false);
    expect(isPeriodActive({ from: '2026-08-01', to: '' })).toBe(true);
    expect(isPeriodActive({ from: '', to: '2026-08-01' })).toBe(true);
  });

  test('ters aralık yakalanır', () => {
    expect(isPeriodInverted({ from: '2026-08-31', to: '2026-08-01' })).toBe(true);
    expect(isPeriodInverted({ from: '2026-08-01', to: '2026-08-31' })).toBe(false);
    expect(isPeriodInverted({ from: '2026-08-01', to: '2026-08-01' })).toBe(false);
  });
});

describe('hızlı dönem seçimleri', () => {
  test('bu ay: ayın ilk ve son günü', () => {
    expect(currentMonth(new Date('2026-08-15T10:00:00Z'))).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });

  test('30 günlük ay doğru biter', () => {
    expect(currentMonth(new Date('2026-09-15T10:00:00Z')).to).toBe('2026-09-30');
  });

  test('şubat ve artık yıl', () => {
    expect(currentMonth(new Date('2026-02-10T10:00:00Z')).to).toBe('2026-02-28');
    expect(currentMonth(new Date('2028-02-10T10:00:00Z')).to).toBe('2028-02-29');
  });

  test('geçen ay', () => {
    expect(previousMonth(new Date('2026-08-15T10:00:00Z'))).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  test('ocakta geçen ay bir önceki YILIN aralığıdır', () => {
    // Yıl sınırını atlamak, ocak ayında ekstreyi tamamen boş gösterirdi.
    expect(previousMonth(new Date('2026-01-10T10:00:00Z'))).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  test('bu yıl 1 ocak - 31 aralık aralığıdır', () => {
    expect(currentYear(new Date('2026-08-15T10:00:00Z'))).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });
});

describe('isSummaryConsistent', () => {
  const base: LedgerSummary = {
    openingBalance: 1000,
    totalDebit: 500,
    totalCredit: 200,
    closingBalance: 1300,
    entryCount: 4,
  };

  test('kapanış = açılış + borç − alacak ise tutarlıdır', () => {
    expect(isSummaryConsistent(base)).toBe(true);
  });

  test('tutmayan özet yakalanır', () => {
    // Kullanıcıyı yanlış bir toplamla göndermektense uyarmak doğrudur.
    expect(isSummaryConsistent({ ...base, closingBalance: 1250 })).toBe(false);
  });

  test('kuruş yuvarlaması tolere edilir', () => {
    expect(isSummaryConsistent({ ...base, closingBalance: 1300.004 })).toBe(true);
  });

  test('negatif bakiye de tutarlı olabilir', () => {
    expect(
      isSummaryConsistent({
        openingBalance: -500,
        totalDebit: 100,
        totalCredit: 300,
        closingBalance: -700,
        entryCount: 2,
      }),
    ).toBe(true);
  });

  test('boş dönem tutarlıdır', () => {
    expect(
      isSummaryConsistent({
        openingBalance: 250,
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 250,
        entryCount: 0,
      }),
    ).toBe(true);
  });
});
