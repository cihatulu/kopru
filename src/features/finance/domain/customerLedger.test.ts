import { describe, test, expect } from 'vitest';
import { buildCustomerLedgers } from './customerLedger';
import type { FinanceTransaction, MinimalOrder } from './finance';

const order = (p: Partial<MinimalOrder>): MinimalOrder => ({
  id: 'o1',
  orderNo: 'SIP-1',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: null,
  parentOrderId: null,
  status: 'pending',
  totalAmount: 0,
  customerName: 'Ayşe Yılmaz',
  customerPhone: '5550001122',
  customerAddress: null,
  manufacturerName: null,
  items: [],
  ...p,
});

const tx = (p: Partial<FinanceTransaction>): FinanceTransaction => ({
  id: 't1',
  retailer_id: 'r',
  type: 'income',
  method: 'cash',
  amount: 0,
  description: null,
  order_id: null,
  manufacturer_id: null,
  created_at: '2026-08-02T00:00:00Z',
  ...p,
});

describe('buildCustomerLedgers', () => {
  test('veri eksikse boş liste döner', () => {
    expect(buildCustomerLedgers(undefined, [])).toEqual([]);
    expect(buildCustomerLedgers([], undefined)).toEqual([]);
  });

  test('adı ve telefonu olmayan sipariş atlanır', () => {
    const rows = buildCustomerLedgers(
      [order({ customerName: null, customerPhone: null, totalAmount: 500 })],
      [],
    );
    expect(rows).toEqual([]);
  });

  test('kök siparişin tutarı borç olarak yazılır', () => {
    const rows = buildCustomerLedgers([order({ totalAmount: 1000 })], []);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.total_order_amount).toBe(1000);
    expect(rows[0]?.remaining_balance).toBe(1000);
    expect(rows[0]?.order_ids).toEqual(['o1']);
  });

  test('alt sipariş borcu İKİ KEZ saymaz — kökün tutarına dahildir', () => {
    const rows = buildCustomerLedgers(
      [
        order({ id: 'root', totalAmount: 1000 }),
        order({ id: 'child', parentOrderId: 'root', totalAmount: 400 }),
      ],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.total_order_amount).toBe(1400);
    expect(rows[0]?.order_ids).toEqual(['root', 'child']);
  });

  test('aynı ad+telefon tek caride toplanır', () => {
    const rows = buildCustomerLedgers(
      [order({ id: 'a', totalAmount: 300 }), order({ id: 'b', totalAmount: 200 })],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.total_order_amount).toBe(500);
  });

  test('farklı telefon ayrı cari açar', () => {
    const rows = buildCustomerLedgers(
      [
        order({ id: 'a', totalAmount: 300 }),
        order({ id: 'b', customerPhone: '5559998877', totalAmount: 200 }),
      ],
      [],
    );
    expect(rows).toHaveLength(2);
  });

  test('tahsilat bakiyeyi düşürür', () => {
    const rows = buildCustomerLedgers(
      [order({ totalAmount: 1000 })],
      [tx({ order_id: 'o1', type: 'income', amount: 400 })],
    );
    expect(rows[0]?.total_paid_amount).toBe(400);
    expect(rows[0]?.remaining_balance).toBe(600);
  });

  test('gider borcu artırır', () => {
    const rows = buildCustomerLedgers(
      [order({ totalAmount: 1000 })],
      [tx({ order_id: 'o1', type: 'expense', amount: 150 })],
    );
    expect(rows[0]?.total_order_amount).toBe(1150);
    expect(rows[0]?.remaining_balance).toBe(1150);
  });

  test('siparişe bağlı olmayan hareket cariye işlenmez', () => {
    const rows = buildCustomerLedgers(
      [order({ totalAmount: 1000 })],
      [tx({ order_id: null, type: 'income', amount: 400 })],
    );
    expect(rows[0]?.remaining_balance).toBe(1000);
  });

  test('bilinmeyen siparişe ait hareket yok sayılır', () => {
    const rows = buildCustomerLedgers(
      [order({ totalAmount: 1000 })],
      [tx({ order_id: 'yok', type: 'income', amount: 400 })],
    );
    expect(rows[0]?.remaining_balance).toBe(1000);
  });

  test('üretici adları tekilleştirilir', () => {
    const rows = buildCustomerLedgers(
      [
        order({ id: 'a', manufacturerName: 'Mobilya A.Ş.' }),
        order({ id: 'b', manufacturerName: 'Mobilya A.Ş.' }),
        order({ id: 'c', manufacturerName: 'Ahşap Ltd.' }),
      ],
      [],
    );
    expect(rows[0]?.manufacturer_names).toEqual(['Mobilya A.Ş.', 'Ahşap Ltd.']);
  });

  test('en yüksek kalan bakiye başa gelir', () => {
    const rows = buildCustomerLedgers(
      [
        order({ id: 'a', customerPhone: '111', totalAmount: 100 }),
        order({ id: 'b', customerPhone: '222', totalAmount: 900 }),
      ],
      [],
    );
    expect(rows[0]?.customer_phone).toBe('222');
    expect(rows[1]?.customer_phone).toBe('111');
  });

  test('onaylanan iade satış fiyatı üzerinden alacak olarak cariden düşer', () => {
    const o = order({
      id: 'o1',
      totalAmount: 1000,
      items: [
        {
          id: 'oi1',
          quantity: 2,
          supplierUnitPrice: 300,
          retailUnitPrice: 500, // Perakende satış fiyatı
          name: 'Yatak',
        },
      ],
    });
    
    const returns = [
      {
        id: 'r1',
        orderId: 'o1',
        decidedAt: '2026-08-03T00:00:00Z',
        items: [{ orderItemId: 'oi1', quantity: 1 }], // 1 adet iade edildi
      },
    ];

    const rows = buildCustomerLedgers([o], [], returns);
    expect(rows[0]?.total_paid_amount).toBe(500); // 1 * 500 = 500 TL alacak
    expect(rows[0]?.remaining_balance).toBe(500); // 1000 - 500 = 500 TL kalan bakiye
  });

  test('iptal edilmiş sipariş alacak olarak cariden düşer', () => {
    const o = order({
      id: 'o1',
      totalAmount: 1000,
      status: 'cancelled',
    });

    const rows = buildCustomerLedgers([o], []);
    expect(rows[0]?.total_paid_amount).toBe(1000); // 1000 TL alacak kaydı
    expect(rows[0]?.remaining_balance).toBe(0); // 1000 - 1000 = 0 TL kalan bakiye
  });
});
