import { describe, test, expect } from 'vitest';
import { toEntry } from './ledgerEntry';

describe('toEntry — DB satırı → ekstre satırı', () => {
  test('alanları eşler ve bakiyeyi balance_after değerinden okur (A18)', () => {
    const e = toEntry({
      id: 'tx-1',
      type: 'debit',
      amount: '1500.50',
      balance_after: '2400.75',
      description: 'Açılış',
      created_at: '2026-08-01T10:00:00Z',
      order_id: null,
    });

    expect(e.id).toBe('tx-1');
    expect(e.type).toBe('debit');
    expect(e.amount).toBe(1500.5);
    expect(e.balanceAfter).toBe(2400.75);
    expect(e.orderId).toBeNull();
    expect(e.orderNo).toBeNull();
    expect(e.itemsSnapshot).toBeUndefined();
  });

  test('eksik/bozuk alanlar güvenli varsayılana düşer', () => {
    const e = toEntry({});
    expect(e.id).toBe('');
    expect(e.amount).toBe(0);
    expect(e.balanceAfter).toBe(0);
    expect(e.description).toBe('');
    expect(e.orderId).toBeNull();
  });

  test('order_id string değilse null olur', () => {
    expect(toEntry({ order_id: 123 }).orderId).toBeNull();
  });
});

describe('toEntry — açıklamaya sipariş numarası yerleştirme', () => {
  const withOrder = (description: string, orderNo = 'SIP-42') =>
    toEntry({ description, order: { order_no: orderNo } }).description;

  test('numara zaten varsa açıklama değişmez', () => {
    expect(withOrder('Sipariş #SIP-42 bakiyesi')).toBe('Sipariş #SIP-42 bakiyesi');
  });

  test('çıplak "Sipariş" numaralandırılır', () => {
    expect(withOrder('Sipariş')).toBe('Sipariş #SIP-42');
  });

  test('DB\'den kırık gelen "Sipari" de numaralandırılır', () => {
    expect(withOrder('Sipari')).toBe('Sipariş #SIP-42');
  });

  test('iptal açıklaması gerekçesini korur', () => {
    expect(withOrder('Sipariş iptali: stok yok')).toBe('Sipariş iptali: #SIP-42 (stok yok)');
  });

  test('gerekçesiz iptal sade kalır', () => {
    expect(withOrder('Sipariş iptali')).toBe('Sipariş iptali: #SIP-42');
  });

  test('iade açıklaması gerekçesini korur', () => {
    expect(withOrder('İade: hasarlı')).toBe('Sipariş iadesi: #SIP-42 (hasarlı)');
  });

  test('gerekçesiz iade sade kalır', () => {
    expect(withOrder('İade')).toBe('Sipariş iadesi: #SIP-42');
  });

  test('tanınmayan açıklamaya numara sonek olarak eklenir', () => {
    expect(withOrder('Nakit tahsilat')).toBe('Nakit tahsilat (#SIP-42)');
  });

  test('sipariş numarası yoksa açıklama olduğu gibi kalır', () => {
    expect(toEntry({ description: 'Sipariş' }).description).toBe('Sipariş');
  });
});

describe('toEntry — ürün anlık görüntüsü', () => {
  test('kalemleri eşler, eksik ada ve adede varsayılan verir', () => {
    const e = toEntry({
      items_snapshot: [
        { name: 'Koltuk', code: 'K-1', quantity: 2, unit_price: 1000, total: 2000 },
        {},
      ],
    });

    expect(e.itemsSnapshot).toHaveLength(2);
    expect(e.itemsSnapshot?.[0]).toEqual({
      name: 'Koltuk',
      code: 'K-1',
      quantity: 2,
      unitPrice: 1000,
      total: 2000,
    });
    expect(e.itemsSnapshot?.[1]?.name).toBe('Ürün');
    expect(e.itemsSnapshot?.[1]?.quantity).toBe(1);
    expect(e.itemsSnapshot?.[1]?.unitPrice).toBeUndefined();
    expect(e.itemsSnapshot?.[1]?.total).toBeUndefined();
  });

  test('boş liste undefined olur — UI "kalem yok" ile "liste boş" ayrımı yapmaz', () => {
    expect(toEntry({ items_snapshot: [] }).itemsSnapshot).toBeUndefined();
  });

  test('items_snapshot dizi değilse yok sayılır', () => {
    expect(toEntry({ items_snapshot: 'bozuk' }).itemsSnapshot).toBeUndefined();
  });
});
