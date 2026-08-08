import { describe, expect, test } from 'vitest';
import { LEDGER_HEADERS, ledgerFileName, ledgerToCsv } from './ledgerCsv';
import type { LedgerSummary } from './period';
import type { LedgerEntry } from '../api/useAccounts';

const BOM = '﻿';

function entry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 't1',
    type: 'debit',
    amount: 1000,
    balanceAfter: 1000,
    description: 'Sipariş #1',
    createdAt: '2026-08-10T09:30:00.000Z',
    orderId: null,
    ...over,
  };
}

const summary: LedgerSummary = {
  openingBalance: 500,
  totalDebit: 1000,
  totalCredit: 300,
  closingBalance: 1200,
  entryCount: 2,
};

describe('ledgerToCsv', () => {
  test('BOM ile başlar', () => {
    // BOM olmazsa Excel Türkçe karakterleri bozar; ekstre okunamaz hale gelir.
    expect(ledgerToCsv([entry()], null, 'Test').startsWith(BOM)).toBe(true);
  });

  test('başlık satırı beklenen sütunları taşır', () => {
    const csv = ledgerToCsv([], null, 'Test');
    expect(csv).toContain(LEDGER_HEADERS.join(';'));
  });

  test('borç ve alacak AYRI sütunlarda', () => {
    // Muhasebenin beklediği biçim budur; tek sütunda işaretle vermek işe yaramaz.
    const csv = ledgerToCsv(
      [entry({ type: 'debit', amount: 1000, balanceAfter: 1000 })],
      null,
      'Test',
    );
    const line = csv.split('\r\n').find((l) => l.includes('Borç'));
    expect(line?.endsWith('1000,00;;1000,00')).toBe(true);
  });

  test('alacak satırında borç sütunu boştur', () => {
    const csv = ledgerToCsv(
      [entry({ type: 'credit', amount: 300, balanceAfter: 700 })],
      null,
      'Test',
    );
    const line = csv.split('\r\n').find((l) => l.includes('Alacak'));
    expect(line?.endsWith(';;300,00;700,00')).toBe(true);
  });

  test('tutarlar iki basamaklı ve ondalık VİRGÜL', () => {
    const csv = ledgerToCsv([entry({ amount: 1234.5, balanceAfter: 1234.5 })], null, 'Test');
    expect(csv).toContain('1234,50');
    expect(csv).not.toContain('1234.50');
  });

  test('satırlar ESKİDEN YENİYE sıralanır', () => {
    // Ekranda tersi gösterilir ama `bakiye` sütunu ancak bu sırada anlamlıdır.
    const csv = ledgerToCsv(
      [
        entry({ id: 'yeni', createdAt: '2026-08-20T00:00:00Z', description: 'ikinci' }),
        entry({ id: 'eski', createdAt: '2026-08-10T00:00:00Z', description: 'birinci' }),
      ],
      null,
      'Test',
    );
    expect(csv.indexOf('birinci')).toBeLessThan(csv.indexOf('ikinci'));
  });

  test('özet verilirse başa yazılır', () => {
    const csv = ledgerToCsv([entry()], summary, 'Ege Mobilya');
    expect(csv).toContain('Ege Mobilya');
    expect(csv).toContain('Devir bakiye');
    expect(csv).toContain('500,00');
    expect(csv).toContain('Kapanış bakiye');
    // Özet, başlık satırından ÖNCE gelir.
    expect(csv.indexOf('Devir bakiye')).toBeLessThan(csv.indexOf('tarih;tur'));
  });

  test('özet yoksa doğrudan başlıkla başlar', () => {
    const csv = ledgerToCsv([entry()], null, 'Test').replace(BOM, '');
    expect(csv.startsWith('tarih;tur')).toBe(true);
  });

  test('açıklamadaki ayraç ve tırnak satırı bozmaz', () => {
    const csv = ledgerToCsv(
      [entry({ description: 'Ödeme; havale "TR12"' })],
      null,
      'Test',
    );
    expect(csv).toContain('"Ödeme; havale ""TR12"""');
  });

  test('boş ekstre de geçerli dosya üretir', () => {
    const csv = ledgerToCsv([], summary, 'Test');
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).toContain(LEDGER_HEADERS.join(';'));
  });
});

describe('ledgerFileName', () => {
  test('firma adı ve tarih içerir', () => {
    expect(ledgerFileName('Ege Mobilya', new Date('2026-08-08T00:00:00Z'))).toBe(
      'cari-ege-mobilya-2026-08-08.csv',
    );
  });

  test('noktalama temizlenir', () => {
    expect(ledgerFileName('A.Ş. Mobilya Ltd.', new Date('2026-08-08T00:00:00Z'))).toBe(
      'cari-a-ş-mobilya-ltd-2026-08-08.csv',
    );
  });

  test('adı tümüyle ayıklanan firma için yedek ad kullanılır', () => {
    // Dosya adı asla "cari--2026-08-08.csv" gibi bozuk olmamalı.
    expect(ledgerFileName('!!!', new Date('2026-08-08T00:00:00Z'))).toBe(
      'cari-ekstre-2026-08-08.csv',
    );
  });
});
