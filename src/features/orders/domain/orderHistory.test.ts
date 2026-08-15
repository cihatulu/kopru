/**
 * Gerçek bir olaydan doğdu: 260815-0001 siparişinin 2. sevkiyatı iptal edildi
 * ama kök siparişin tarihçesinde iptal HİÇ görünmedi. Sebep, sevkiyatın
 * oluşturulmasının köke, iptalinin çocuğa yazılmasıydı.
 */
import { describe, expect, test } from 'vitest';
import { buildHistory, type OrderLogRow } from './orderHistory';
import type { ChildShipment } from './orderMapping';

const ROOT = 'root-id';

const shipments: ChildShipment[] = [
  {
    id: 'sevk-1',
    shipmentNo: 'Sevk-1',
    createdAt: '2026-08-15T21:29:11Z',
    totalAmount: 100,
    status: 'shipped',
  },
  {
    id: 'sevk-2',
    shipmentNo: 'Sevk-2',
    createdAt: '2026-08-15T21:29:16Z',
    totalAmount: 100,
    status: 'cancelled',
  },
];

const log = (over: Partial<OrderLogRow>): OrderLogRow => ({
  id: 'l',
  order_id: ROOT,
  from_status: null,
  to_status: 'pending',
  note: null,
  created_at: '2026-08-15T19:10:15Z',
  ...over,
});

describe('buildHistory', () => {
  test('çocuk siparişin İPTALİ kök tarihçesinde görünür', () => {
    const out = buildHistory(
      [log({ id: 'x', order_id: 'sevk-2', to_status: 'cancelled', note: '333 iptal' })],
      shipments,
      ROOT,
    );
    expect(out[0]?.toStatus).toBe('cancelled');
    expect(out[0]?.shipmentBadge).toBe('Sevk-2');
  });

  test('rozet kaydın SAHİBİ siparişten gelir, sıradan değil', () => {
    // Sayaç mantığı burada kayardı: iptal kaydı listeye girince sonraki
    // sevkiyatın rozeti bir kayardı.
    const out = buildHistory(
      [
        log({ id: 'a', order_id: 'sevk-2', to_status: 'cancelled' }),
        log({ id: 'b', order_id: 'sevk-1', to_status: 'shipped' }),
      ],
      shipments,
      ROOT,
    );
    expect(out.map((h) => h.shipmentBadge)).toEqual(['Sevk-2', 'Sevk-1']);
  });

  test('kökteki sevkiyat OLUŞTURMA kaydı aynı andaki çocukla eşleşir', () => {
    const out = buildHistory(
      [
        log({
          id: 'c',
          order_id: ROOT,
          to_status: 'partially_shipped',
          note: '2222',
          created_at: '2026-08-15T21:29:16Z',
        }),
      ],
      shipments,
      ROOT,
    );
    expect(out[0]?.shipmentBadge).toBe('Sevk-2');
  });

  test('sevkiyatla ilgisi olmayan kök kaydına rozet takılmaz', () => {
    // Eski sürüm `note` içinde "sevkiyat" arıyordu; metne bakmak kırılgandı.
    const out = buildHistory(
      [log({ to_status: 'in_production', note: 'üretime alındı, sevkiyat sonra' })],
      shipments,
      ROOT,
    );
    expect(out[0]?.shipmentBadge).toBeNull();
  });

  test('sevkiyatı olmayan siparişte hiçbir rozet yoktur', () => {
    const out = buildHistory([log({ to_status: 'pending' })], [], ROOT);
    expect(out[0]?.shipmentBadge).toBeNull();
  });

  test('boş not null olur — ekranda boş kutu çıkmasın', () => {
    expect(buildHistory([log({ note: '   ' })], [], ROOT)[0]?.note).toBeNull();
  });

  test('durumu olmayan kayıt pending sayılır', () => {
    expect(buildHistory([log({ to_status: null })], [], ROOT)[0]?.toStatus).toBe('pending');
  });
});
