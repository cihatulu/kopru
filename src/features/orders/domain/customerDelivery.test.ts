import { describe, it, expect } from 'vitest';
import { toRow } from './orderMapping';

describe('Customer Delivery & Tracking Domain', () => {
  it('toRow maps customer_deliveries array and computes latestDelivery', () => {
    const rawOrder = {
      id: 'order-123',
      order_no: '260830-0003',
      status: 'delivered',
      total_amount: 150000,
      created_at: '2026-08-30T10:00:00Z',
      manufacturer_org_id: 'mfr-1',
      retailer_org_id: 'ret-1',
      relationship_id: 'rel-1',
      customer_name: 'Asiye Kara',
      customer_phone: '05551112233',
      customer_address: 'İnegöl, Bursa',
      customer_deliveries: [
        {
          id: 'deliv-1',
          delivery_date: '2026-09-02',
          time_slot: '14:00 - 18:00',
          status: 'planned',
          customer_name: 'Asiye Kara',
          customer_phone: '05551112233',
          customer_address: 'İnegöl, Bursa',
          notes: '3. kat asansörsüz',
          items: [{ order_item_id: 'item-1', name: 'Koltuk Takımı', quantity: 1 }],
          created_at: '2026-08-30T15:00:00Z',
        },
      ],
      manufacturer: { company_name: 'Hakan Mobilya' },
      retailer: { company_name: 'Kenan Mobilya' },
    };

    const row = toRow(rawOrder, 'ret-1');
    expect(row.customerDeliveries).toHaveLength(1);
    expect(row.latestDelivery).not.toBeNull();
    expect(row.latestDelivery?.deliveryDate).toBe('2026-09-02');
    expect(row.latestDelivery?.timeSlot).toBe('14:00 - 18:00');
    expect(row.latestDelivery?.notes).toBe('3. kat asansörsüz');
    expect(row.customerPhone).toBe('05551112233');
  });

  it('handles empty customer_deliveries gracefully', () => {
    const rawOrder = {
      id: 'order-124',
      order_no: '260830-0004',
      status: 'delivered',
      total_amount: 50000,
      created_at: '2026-08-30T10:00:00Z',
      manufacturer_org_id: 'mfr-1',
      retailer_org_id: 'ret-1',
      relationship_id: 'rel-1',
      manufacturer: { company_name: 'Hakan Mobilya' },
    };

    const row = toRow(rawOrder, 'ret-1');
    expect(row.customerDeliveries).toEqual([]);
    expect(row.latestDelivery).toBeNull();
  });
});
