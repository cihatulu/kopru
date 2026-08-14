import { describe, expect, test } from 'vitest';
import {
  aggregate,
  isCustomerPayment,
  linesTotal,
  mergedHistory,
  sourcesOf,
  stepIndexOf,
  type TrackedItem,
  type TrackedOrder,
} from './tracking';

const item = (over: Partial<TrackedItem> = {}): TrackedItem => ({
  productId: 'p1',
  name: 'Largo',
  quantity: 4,
  unit_price: 1000,
  total_price: 4000,
  ...over,
});

const order = (over: Partial<TrackedOrder> = {}): TrackedOrder => ({
  order_no: '260813-0001',
  status: 'pending',
  customer_name: 'Ahmet',
  note: null,
  created_at: '2026-08-13T00:00:00Z',
  updated_at: '2026-08-13T00:00:00Z',
  items: [item()],
  returned_items: [],
  history: [],
  shipments: [],
  payments: [],
  ...over,
});

describe('stepIndexOf', () => {
  test('dört ana aşama sırayla', () => {
    expect(stepIndexOf('pending')).toBe(0);
    expect(stepIndexOf('in_production')).toBe(1);
    expect(stepIndexOf('shipped')).toBe(2);
    expect(stepIndexOf('delivered')).toBe(3);
  });

  test('KÖPRÜ ye özgü ara durumlar en yakın aşamaya eşlenir', () => {
    expect(stepIndexOf('confirmed')).toBe(0);
    expect(stepIndexOf('partially_shipped')).toBe(2);
    expect(stepIndexOf('return_requested')).toBe(2);
  });

  test('iptal ve iade zincir dışıdır', () => {
    expect(stepIndexOf('cancelled')).toBe(-1);
    expect(stepIndexOf('returned')).toBe(-1);
  });
});

describe('aggregate', () => {
  test('kök ve sevkiyatlar birlikte toplanır', () => {
    const o = order({
      items: [item({ quantity: 1 })],
      shipments: [
        {
          id: 's1',
          status: 'shipped',
          created_at: '',
          items: [item({ quantity: 3 })],
          returned_items: [],
          history: [],
        },
      ],
    });
    // Kısmi sevkiyatta adet çocuğa taşınır; orijinal toplam yine 4 olmalı.
    expect(aggregate(sourcesOf(o), 'original')).toEqual([
      {
        key: 'p1|',
        name: 'Largo',
        unitPrice: 1000,
        quantity: 4,
        customDescription: null,
        priceDifference: 0,
      },
    ]);
  });

  test('ürünün kendi fiyatı ayrılır, fark ayrı satırda durur', () => {
    // `unit_price` her şey dahil gelir (45.000). Ekran ürünü 40.000 gösterip
    // farkı +5.000 olarak altına yazar; ürünün fiyatı pazarlıkla oynamaz.
    const o = order({
      items: [
        item({ quantity: 1, unit_price: 45000, custom_description: 'Cam kapak', price_difference: 5000 }),
      ],
    });
    const line = aggregate(sourcesOf(o), 'original')[0];
    expect(line?.unitPrice).toBe(40000);
    expect(line?.priceDifference).toBe(5000);
  });

  test('eksi fark indirimdir: ürün 40.000 kalır, fark −10.000 yazılır', () => {
    const o = order({
      items: [
        item({ quantity: 1, unit_price: 30000, custom_description: 'xxxxxxx', price_difference: -10000 }),
      ],
    });
    const line = aggregate(sourcesOf(o), 'original')[0];
    expect(line?.unitPrice).toBe(40000);
    expect(line?.priceDifference).toBe(-10000);
    // Toplam yine 30.000: taban ile fark ekranda ayrılır, hesapta birleşir.
    expect(linesTotal(aggregate(sourcesOf(o), 'original'))).toBe(30000);
  });

  test('fark adetle çarpılır', () => {
    const o = order({
      items: [
        item({ quantity: 3, unit_price: 45000, custom_description: 'Cam kapak', price_difference: 5000 }),
      ],
    });
    expect(linesTotal(aggregate(sourcesOf(o), 'original'))).toBe(135000);
  });

  test('aynı ürün farklı özel talebe sahipse ayrı satır kalır', () => {
    const o = order({
      items: [
        item({ quantity: 1, custom_description: 'Kapılar cam olsun' }),
        item({ quantity: 2 }),
      ],
    });
    const lines = aggregate(sourcesOf(o), 'original');
    expect(lines).toHaveLength(2);
    expect(lines[0]?.customDescription).toBe('Kapılar cam olsun');
    expect(lines[1]?.customDescription).toBeNull();
  });

  test('aynı talep aynı üründe toplanır', () => {
    const o = order({
      items: [
        item({ quantity: 1, custom_description: 'Cam kapak' }),
        item({ quantity: 3, custom_description: 'Cam kapak' }),
      ],
    });
    expect(aggregate(sourcesOf(o), 'original')).toHaveLength(1);
    expect(aggregate(sourcesOf(o), 'original')[0]?.quantity).toBe(4);
  });

  test('kalan hesabında iade edilen adet düşülür', () => {
    const o = order({
      items: [item({ quantity: 4 })],
      returned_items: [{ productId: 'p1', quantity: 1 }],
    });
    expect(aggregate(sourcesOf(o), 'original')[0]?.quantity).toBe(4);
    expect(aggregate(sourcesOf(o), 'remaining')[0]?.quantity).toBe(3);
  });

  test('iptal edilen kaynak kalandan tamamen düşer ama orijinali korur', () => {
    const o = order({ status: 'cancelled', items: [item({ quantity: 2 })] });
    expect(aggregate(sourcesOf(o), 'original')[0]?.quantity).toBe(2);
    expect(aggregate(sourcesOf(o), 'remaining')).toHaveLength(0);
  });

  test('tamamı iade edilen kalem kalanda görünmez', () => {
    const o = order({
      items: [item({ quantity: 2 })],
      returned_items: [{ productId: 'p1', quantity: 2 }],
    });
    expect(aggregate(sourcesOf(o), 'remaining')).toHaveLength(0);
  });
});

describe('mergedHistory', () => {
  test('kök ve sevkiyat kayıtları zamana göre birleşir', () => {
    const o = order({
      history: [
        { status: 'pending', note: 'Sipariş alındı', created_at: '2026-08-13T10:00:00Z' },
        { status: 'in_production', note: null, created_at: '2026-08-13T12:00:00Z' },
      ],
      shipments: [
        {
          id: 's1',
          status: 'shipped',
          created_at: '',
          items: [],
          returned_items: [],
          history: [
            { status: 'shipped', note: 'Kargoya verildi', created_at: '2026-08-13T11:00:00Z' },
          ],
        },
      ],
    });

    const merged = mergedHistory(o);
    expect(merged.map((h) => h.note)).toEqual(['Sipariş alındı', 'Kargoya verildi', null]);
  });
});

describe('linesTotal', () => {
  test('birim × adet toplanır', () => {
    expect(linesTotal(aggregate(sourcesOf(order()), 'original'))).toBe(4000);
  });
});

describe('isCustomerPayment', () => {
  test('iptal ve iade karşılığı alacaklar tahsilat sayılmaz', () => {
    expect(isCustomerPayment({ amount: 1, method: 'cash', description: 'Sipariş iptali', created_at: '' })).toBe(false);
    expect(isCustomerPayment({ amount: 1, method: 'cash', description: 'İade bedeli', created_at: '' })).toBe(false);
  });

  test('normal tahsilat sayılır', () => {
    expect(isCustomerPayment({ amount: 1, method: 'cash', description: 'Peşinat', created_at: '' })).toBe(true);
    expect(isCustomerPayment({ amount: 1, method: 'cash', description: null, created_at: '' })).toBe(true);
  });
});
