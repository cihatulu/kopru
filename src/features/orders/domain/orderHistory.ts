/**
 * Sipariş tarihçesinin kurulması — SAF (A20).
 *
 * Kök siparişin tarihçesi ÇOCUK siparişlerin kayıtlarını da içerir: sevkiyatın
 * OLUŞTURULMASI köke, İPTALİ çocuğa yazılıyor. Yalnız kök sorgulandığında aynı
 * sevkiyatın doğuşu görünüyor, ölümü görünmüyordu.
 */
import type { OrderStatus } from './status';
import type { ChildShipment, OrderStatusLogItem } from './orderMapping';

export interface OrderLogRow {
  id: string;
  order_id?: string | null;
  from_status: OrderStatus | null;
  to_status: OrderStatus | null;
  note: string | null;
  created_at: string;
}

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Durum kayıtlarına "Sevk-N" rozeti takar.
 *
 * Rozet, kaydın AİT OLDUĞU sipariş kimliğinden türetilir. Önceki sürüm bir
 * sayaç tutuyor ve `note` metninde "sevkiyat" kelimesi arıyordu; çocuk
 * siparişlerin kayıtları listeye girince o sayaç kayar ve rozeti YANLIŞ
 * sevkiyata basardı. Kimlik eşlemesi ne sıraya ne de not metnine bağlıdır.
 *
 * Kökün kendi kaydında rozet, aynı anda doğan çocuktan bulunur: sevkiyat
 * oluşturma olayı köke yazılır ve çocuk kayıtla aynı zaman damgasını taşır.
 */
export function buildHistory(
  logs: readonly OrderLogRow[],
  shipments: readonly ChildShipment[],
  rootId: string,
): OrderStatusLogItem[] {
  const byId = new Map(shipments.map((s) => [s.id, s.shipmentNo]));

  return logs.map((l) => {
    const ownerId = text(l.order_id);
    let shipmentBadge: string | null = byId.get(ownerId) ?? null;

    if (!shipmentBadge && ownerId === rootId) {
      const created = text(l.created_at);
      shipmentBadge = shipments.find((s) => s.createdAt === created)?.shipmentNo ?? null;
    }

    return {
      id: text(l.id),
      fromStatus: l.from_status ?? null,
      toStatus: l.to_status ?? 'pending',
      note: l.note && l.note.trim() !== '' ? l.note : null,
      createdAt: text(l.created_at),
      shipmentBadge,
    };
  });
}
