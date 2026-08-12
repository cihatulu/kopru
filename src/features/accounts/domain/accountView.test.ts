import { describe, expect, test } from 'vitest';
import {
  BALANCE_LABEL,
  balanceSide,
  balanceSuffix,
  columnLabels,
  filterAccounts,
  filterEntries,
  manualEntryOptions,
  type AccountRow,
} from './accountView';

function row(over: Partial<AccountRow> = {}): AccountRow {
  return {
    relationshipId: 'r1',
    counterpartyOrgId: 'o1',
    companyName: 'Ege Mobilya',
    vknTc: '1234567890',
    totalDebit: 180000,
    totalCredit: 0,
    balance: 180000,
    counterpartyIsSubscriber: true,
    ...over,
  };
}

describe('balanceSide', () => {
  test('pozitif bakiye ÜRETİCİ için alacaktır', () => {
    // balance_after her zaman "perakendeci ne kadar borçlu" demek.
    expect(balanceSide(180000, true)).toBe('receivable');
  });

  test('aynı sayı PERAKENDECİ için borçtur', () => {
    expect(balanceSide(180000, false)).toBe('payable');
  });

  test('negatif bakiye tersine döner', () => {
    expect(balanceSide(-5000, true)).toBe('payable');
    expect(balanceSide(-5000, false)).toBe('receivable');
  });

  test('sıfır bakiye iki taraf için de kapalıdır', () => {
    expect(balanceSide(0, true)).toBe('settled');
    expect(balanceSide(0, false)).toBe('settled');
  });

  test('kuruş altı fark kapalı sayılır', () => {
    // Yuvarlamadan kalan 0,001 için "BORÇLU" yazmak yanlış olurdu.
    expect(balanceSide(0.001, true)).toBe('settled');
  });

  test('her durumun etiketi ve kısaltması var', () => {
    for (const s of ['receivable', 'payable', 'settled'] as const) {
      expect(BALANCE_LABEL[s]).toBeTruthy();
    }
    expect(balanceSuffix('receivable')).toBe('(A)');
    expect(balanceSuffix('payable')).toBe('(B)');
    expect(balanceSuffix('settled')).toBe('');
  });
});

describe('columnLabels', () => {
  test('üretici için borç ve alacak sütun başlıkları', () => {
    expect(columnLabels(true)).toEqual({
      debit: 'Borç (Tahsilatlar)',
      credit: 'Alacak (Satışlar)',
    });
  });

  test('perakendeci için borç ve alacak sütun başlıkları', () => {
    expect(columnLabels(false)).toEqual({
      debit: 'Borç (Alışlar)',
      credit: 'Alacak (Ödemeler)',
    });
  });
});

describe('manualEntryOptions', () => {
  test('üreticinin seçenekleri tahsilat ve ek gider', () => {
    const opts = manualEntryOptions(true);
    expect(opts.map((o) => o.value)).toEqual(['credit', 'debit']);
    expect(opts[0]?.label).toContain('Tahsilat');
  });

  test('perakendecinin metinleri kendi bakışıyla yazılır', () => {
    expect(manualEntryOptions(false)[0]?.label).toContain('Ödeme Yaptım');
  });
});

describe('filterEntries', () => {
  const entries = [
    { description: 'Sipariş #SIP-2026-0007' },
    { description: 'Havale tahsilatı' },
  ];

  test('boş arama hepsini döndürür', () => {
    expect(filterEntries(entries, '  ')).toHaveLength(2);
  });

  test('sipariş numarasıyla bulunur', () => {
    expect(filterEntries(entries, '0007')).toHaveLength(1);
  });

  test('açıklama metniyle de bulunur, büyük-küçük harf ayırmaz', () => {
    expect(filterEntries(entries, 'HAVALE')).toHaveLength(1);
  });

  test('eşleşme yoksa boş döner', () => {
    expect(filterEntries(entries, 'iade')).toHaveLength(0);
  });
});

describe('filterAccounts', () => {
  const rows = [row(), row({ companyName: 'Anadolu Mobilya', vknTc: '9999999999' })];

  test('boş arama hepsini döndürür', () => {
    expect(filterAccounts(rows, '   ')).toHaveLength(2);
  });

  test('firma adına göre süzer, büyük-küçük harf ayırmaz', () => {
    expect(filterAccounts(rows, 'EGE')).toHaveLength(1);
  });

  test('vergi numarasıyla da bulunur', () => {
    expect(filterAccounts(rows, '9999')).toHaveLength(1);
  });

  test('eşleşme yoksa boş döner', () => {
    expect(filterAccounts(rows, 'yok')).toHaveLength(0);
  });
});
