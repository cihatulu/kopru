import { describe, expect, test } from 'vitest';
import { filterLedgers, filterTransactions, pageSlice, type FinanceTxRow } from './financeFilters';
import type { CustomerLedger } from './customerLedger';

function tx(over: Partial<FinanceTxRow> = {}): FinanceTxRow {
  return {
    id: 't1',
    retailer_id: 'r1',
    type: 'income',
    method: 'cash',
    amount: 100,
    description: null,
    order_id: null,
    manufacturer_id: null,
    created_at: '2026-03-14T10:00:00Z',
    runningBalance: 100,
    ...over,
  };
}

function ledger(over: Partial<CustomerLedger> = {}): CustomerLedger {
  return {
    customer_name: 'Ayşe Yılmaz',
    customer_phone: '05551112233',
    total_order_amount: 1000,
    total_paid_amount: 400,
    remaining_balance: 600,
    order_ids: ['o1'],
    manufacturer_names: ['Ege Mobilya'],
    ...over,
  };
}

describe('filterTransactions', () => {
  test('boş süzgeç hiçbir satırı elemez', () => {
    const rows = [tx(), tx({ id: 't2' })];
    expect(filterTransactions(rows, { date: '', customerName: '', manufacturerName: '' })).toHaveLength(2);
  });

  test('müşteri adı büyük/küçük harf duyarsız aranır', () => {
    const rows = [
      tx({ order: { customer_name: 'Mehmet Kaya' } }),
      tx({ id: 't2', order: { customer_name: 'Ayşe Yılmaz' } }),
    ];
    const out = filterTransactions(rows, { date: '', customerName: 'mehmet', manufacturerName: '' });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('t1');
  });

  test('üretici adı hem kaydın kendisinden hem siparişten okunur', () => {
    const rows = [
      tx({ manufacturer: { company_name: 'Ege Mobilya' } }),
      tx({ id: 't2', order: { customer_name: null, manufacturer: { company_name: 'Batı Ahşap' } } }),
    ];
    expect(filterTransactions(rows, { date: '', customerName: '', manufacturerName: 'batı' }))
      .toHaveLength(1);
  });

  test('süzgeçler VE ile birleşir', () => {
    const rows = [tx({ order: { customer_name: 'Mehmet Kaya' }, manufacturer: { company_name: 'Ege Mobilya' } })];
    expect(filterTransactions(rows, { date: '', customerName: 'mehmet', manufacturerName: 'batı' }))
      .toHaveLength(0);
  });
});

describe('filterLedgers', () => {
  test('telefon parçası eşleşir', () => {
    const rows = [ledger(), ledger({ customer_name: 'Ali Veli', customer_phone: '05329998877' })];
    const out = filterLedgers(rows, { customerName: '', customerPhone: '5551', manufacturerName: '' });
    expect(out).toHaveLength(1);
    expect(out[0]?.customer_name).toBe('Ayşe Yılmaz');
  });

  test('üretici listesi virgüllü metin olarak aranır', () => {
    const rows = [ledger({ manufacturer_names: ['Ege Mobilya', 'Batı Ahşap'] })];
    expect(filterLedgers(rows, { customerName: '', customerPhone: '', manufacturerName: 'ahşap' }))
      .toHaveLength(1);
  });
});

describe('pageSlice', () => {
  const rows = [1, 2, 3, 4, 5];

  test('sayfa 1 baştan başlar', () => {
    expect(pageSlice(rows, 1, 2)).toEqual([1, 2]);
  });

  test('son sayfa eksik kalabilir', () => {
    expect(pageSlice(rows, 3, 2)).toEqual([5]);
  });

  test('aralık dışı sayfa boş döner', () => {
    expect(pageSlice(rows, 9, 2)).toEqual([]);
  });
});
