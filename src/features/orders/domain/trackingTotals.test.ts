import { describe, expect, test } from 'vitest';
import type { TrackedItem, TrackedOrder, TrackedShipment } from './tracking';
import { displayShipments, returnedLines, shipmentLines, trackSummary } from './trackingTotals';
import { cleanPublicNote } from './trackingNotes';
import { plannedQuantities, toCustomerDeliveries } from './customerDeliveryMapping';

const item = (over: Partial<TrackedItem> = {}): TrackedItem => ({
  productId: 'p1', name: 'Largo', quantity: 4, unit_price: 1000, total_price: 4000, ...over,
});

const order = (over: Partial<TrackedOrder> = {}): TrackedOrder => ({
  order_no: '260813-0001', status: 'pending', customer_name: 'Ahmet', note: null,
  created_at: '2026-08-13T00:00:00Z', updated_at: '2026-08-13T00:00:00Z',
  items: [item()], returned_items: [], history: [], shipments: [], payments: [], ...over,
});

const shipment = (over: Partial<TrackedShipment> = {}): TrackedShipment => ({
  id: 's1', order_no: '260813-0001-01', status: 'shipped', note: null,
  created_at: '2026-08-14T00:00:00Z', items: [], returned_items: [], history: [], ...over,
});

describe('trackSummary', () => {
  test('ödeme ve iade düşülerek bakiye hesaplanır', () => {
    const s = trackSummary(order({
      returned_items: [{ productId: 'p1', name: 'Largo', quantity: 1 }],
      payments: [
        { amount: 1000, method: 'cash', description: null, created_at: '' },
        { amount: 500, method: 'cash', description: 'İade bedeli', created_at: '' },
      ],
    }));
    expect(s.originalTotal).toBe(4000);
    expect(s.totalReturnAmount).toBe(1000);
    expect(s.effectiveTotal).toBe(3000);
    expect(s.paid).toBe(1000);
    expect(s.balance).toBe(2000);
  });
});

describe('displayShipments', () => {
  test('sevk edilen kökte çocuğa taşınmayan kalan kart olarak eklenir', () => {
    const o = order({ status: 'shipped', shipments: [shipment({ items: [item({ quantity: 1 })] })] });
    const list = displayShipments(o, trackSummary(o).original);
    const parent = list.find((s) => s.id === 'parent-shipment');
    // İlk hâl kök (4) + çocuk (1) = 5; çocuğa ayrılan 1 düşülür → kökte 4 kalır.
    expect(parent?.items[0]?.quantity).toBe(4);
    expect(list).toHaveLength(2);
  });

  test('bekleyen siparişte kök kartı eklenmez', () => {
    expect(displayShipments(order(), trackSummary(order()).original)).toHaveLength(0);
  });
});

describe('shipmentLines / returnedLines', () => {
  test('iade net teslim tutarından düşülür', () => {
    const s = shipment({
      items: [item({ quantity: 2 })],
      returned_items: [{ productId: 'p1', name: 'Largo', quantity: 1 }],
    });
    const r = shipmentLines(s, []);
    expect(r.netDeliveredTotal).toBe(1000);
    expect(r.returnTotal).toBe(1000);
  });

  test('iade satırı kalem kimliğiyle eşlenir ve fiyatı tamamlanır', () => {
    const withId = { ...item({ productId: null, name: 'Koltuk', unit_price: 700 }), id: 'oi1' };
    const s = shipment({ items: [withId, item()], returned_items: [{ orderItemId: 'oi1', quantity: 2 }] });
    const r = returnedLines(s, order(), []);
    expect(r.lines[0]).toEqual({ rName: 'Koltuk', rQuantity: 2, rUnitPrice: 700, rTotal: 1400 });
    expect(r.total).toBe(1400);
  });
});

describe('cleanPublicNote', () => {
  test.each([
    ['İADE onaylandı', null],
    ['Müşteri teslimat planlandı', null],
    ['140000.00 TL', null],
    ['toptan fiyat güncellendi', null],
    ['  Kapıda teslim  ', 'Kapıda teslim'],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(cleanPublicNote(input)).toBe(expected);
  });
});

describe('customerDeliveryMapping', () => {
  test('planlanan adetler kimlik ve ada göre toplanır', () => {
    const list = toCustomerDeliveries([
      { id: 'd1', items: [{ order_item_id: 'oi1', name: 'Largo', quantity: 2 }] },
      { id: 'd2', items: [{ name: 'Largo', quantity: 1 }] },
    ]);
    const p = plannedQuantities(list);
    expect(p.byItemId.get('oi1')).toBe(2);
    expect(p.byName.get('Largo')).toBe(3);
    expect(list[0]?.status).toBe('planned');
  });

  test('dizi değilse boş liste', () => {
    expect(toCustomerDeliveries(null)).toEqual([]);
  });
});
